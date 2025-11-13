import json
import random
import asyncio
from typing import Dict, List, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    with open("word_packages.json", "r", encoding="utf-8") as f:
        WORD_PACKAGES = json.load(f)
except FileNotFoundError:
    print("Error: word_packages.json not found! Using fallback words.")
    WORD_PACKAGES = {
        "Klasika": {
            "Vlastnost": ["Vzteklý", "Elegantní", "Líný", "Šťastný", "Smutný"],
            "Subjekt": ["Klaun", "Velryba", "Astronaut", "Robot", "Kočka"],
            "Činnost": ["peče dort", "hraje golf", "tančí", "spí", "jí banán"]
        }
    }


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.game_states: Dict[str, Dict[str, Any]] = {}

    def get_player_websocket(self, game_code: str, username: str) -> WebSocket | None:
        """Helper to find a player's websocket."""
        game_state = self.game_states.get(game_code)
        if game_state:
            for player in game_state["players"]:
                if player["username"] == username:
                    return player["websocket"]
        return None

    async def connect(self, websocket: WebSocket, game_code: str, username: str):
        await websocket.accept()
        is_new_game = game_code not in self.active_connections

        if is_new_game:
            self.active_connections[game_code] = []
            default_package = list(WORD_PACKAGES.keys())[0]
            self.game_states[game_code] = {
                "players": [], "scores": {}, "current_round": 0, "total_rounds": 3,
                "current_artist": None, "selected_phrase": [], "masked_phrase": "",
                "host": username, "selected_package": default_package, "game_started": False
            }

        game_state = self.game_states[game_code]
        if game_state["game_started"]:
            await websocket.close(code=1008, reason="Hra již probíhá.")
            return

        self.active_connections[game_code].append(websocket)
        game_state["players"].append({"username": username, "websocket": websocket})
        game_state["scores"][username] = 0

        await self.broadcast(game_code, {
            "type": "player_joined", "username": username,
            "players": [{"username": p["username"]} for p in game_state["players"]],
            "host": game_state["host"]
        })

        if game_state["host"] == username:
            await self.send_personal_message({
                "type": "available_packages", "packages": list(WORD_PACKAGES.keys()),
                "selected_package": game_state["selected_package"]
            }, websocket)

    async def disconnect(self, websocket: WebSocket, game_code: str, username: str):
        if game_code not in self.game_states:
            return

        game_state = self.game_states[game_code]
        original_host = game_state["host"]

        self.active_connections[game_code] = [conn for conn in self.active_connections[game_code] if conn != websocket]
        game_state["players"] = [p for p in game_state["players"] if p["username"] != username]
        if username in game_state["scores"]:
            del game_state["scores"][username]

        if not game_state["players"]:
            del self.active_connections[game_code]
            del self.game_states[game_code]
            return

        # Assign a new host only if the original host disconnected
        if original_host == username:
            new_host = game_state["players"][0]["username"]
            game_state["host"] = new_host
            await self.broadcast(game_code, {"type": "new_host", "host": new_host})
            # Send package list to the new host
            new_host_ws = self.get_player_websocket(game_code, new_host)
            if new_host_ws:
                await self.send_personal_message({
                    "type": "available_packages", "packages": list(WORD_PACKAGES.keys()),
                    "selected_package": game_state["selected_package"]
                }, new_host_ws)

        await self.broadcast(game_code, {
            "type": "player_left", "username": username,
            "players": [{"username": p["username"]} for p in game_state["players"]]
        })

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

    async def broadcast(self, game_code: str, message: dict):
        if game_code in self.active_connections:
            for connection in self.active_connections[game_code]:
                await connection.send_json(message)

manager = ConnectionManager()

def get_words_for_round(package_name: str):
    package = WORD_PACKAGES.get(package_name, list(WORD_PACKAGES.values())[0])
    return {
        "Vlastnost": random.sample(package["Vlastnost"], min(3, len(package["Vlastnost"]))),
        "Subjekt": random.sample(package["Subjekt"], min(3, len(package["Subjekt"]))),
        "Činnost": random.sample(package["Činnost"], min(3, len(package["Činnost"]))),
    }

@app.websocket("/ws/{game_code}/{username}")
async def websocket_endpoint(websocket: WebSocket, game_code: str, username: str):
    await manager.connect(websocket, game_code, username)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            game_state = manager.game_states.get(game_code)
            if not game_state: break

            if message["type"] == "select_package" and game_state["host"] == username:
                package_name = message.get("package")
                if package_name in WORD_PACKAGES:
                    game_state["selected_package"] = package_name
                    await manager.broadcast(game_code, {"type": "package_selected", "package": package_name})

            elif message["type"] == "start_game" and game_state["host"] == username:
                game_state["game_started"] = True
                game_state["total_rounds"] = len(game_state["players"])
                await start_round(game_code)

            elif message["type"] == "select_phrase" and game_state["current_artist"] == username:
                selected_phrase = message["phrase"]
                game_state["selected_phrase"] = selected_phrase
                game_state["masked_phrase"] = " ".join(["_" * len(word) for word in selected_phrase])
                await manager.broadcast(game_code, {"type": "phrase_selected", "masked_phrase": game_state["masked_phrase"]})
                game_state["round_timer"] = asyncio.create_task(round_timer(game_code, 90))

            elif message["type"] == "drawing_data" and game_state["current_artist"] == username:
                await manager.broadcast(game_code, {"type": "drawing_update", "data": message["data"]})

            elif message["type"] == "clear_canvas" and game_state["current_artist"] == username:
                await manager.broadcast(game_code, {"type": "canvas_cleared"})

            elif message["type"] == "guess" and game_state["current_artist"] != username:
                await handle_guess(game_code, username, message["guess"])

    except WebSocketDisconnect:
        await manager.disconnect(websocket, game_code, username)
    except Exception as e:
        print(f"WebSocket error: {e}")
        await manager.disconnect(websocket, game_code, username)

async def handle_guess(game_code: str, username: str, guess: str):
    game_state = manager.game_states.get(game_code)
    if not game_state or not game_state["selected_phrase"]: return

    guess = guess.strip().lower()
    correct_guess = False
    revealed_word = ""

    revealed_phrase_list = game_state["masked_phrase"].split()
    for i, word in enumerate(game_state["selected_phrase"]):
        if word.lower() == guess and revealed_phrase_list[i].startswith("_"):
            revealed_phrase_list[i] = word
            revealed_word = word
            correct_guess = True
            break

    if correct_guess:
        game_state["masked_phrase"] = " ".join(revealed_phrase_list)
        game_state["scores"][username] = game_state["scores"].get(username, 0) + 10
        artist = game_state["current_artist"]
        if artist in game_state["scores"]:
            game_state["scores"][artist] += 5

        await manager.broadcast(game_code, {
            "type": "word_guessed", "guesser": username, "word": revealed_word,
            "revealed_phrase": game_state["masked_phrase"], "scores": game_state["scores"]
        })
        if "_" not in game_state["masked_phrase"]:
            if game_state.get("round_timer"): game_state["round_timer"].cancel()
            await end_round(game_code)
    else:
        await manager.broadcast(game_code, {"type": "chat_message", "username": username, "message": guess})

async def round_timer(game_code: str, duration: int):
    try:
        await asyncio.sleep(duration)
        if game_code in manager.game_states:
            await end_round(game_code)
    except asyncio.CancelledError:
        pass

async def start_round(game_code: str):
    game_state = manager.game_states.get(game_code)
    if not game_state or not game_state["players"]: return

    game_state["current_round"] += 1
    if game_state["current_round"] > game_state["total_rounds"]:
        await end_game(game_code)
        return

    game_state["selected_phrase"], game_state["masked_phrase"] = [], ""

    artist_index = (game_state["current_round"] - 1) % len(game_state["players"])
    game_state["current_artist"] = game_state["players"][artist_index]["username"]

    await manager.broadcast(game_code, {
        "type": "round_start", "round": game_state["current_round"],
        "total_rounds": game_state["total_rounds"], "artist": game_state["current_artist"]
    })

    words = get_words_for_round(game_state["selected_package"])
    artist_ws = manager.get_player_websocket(game_code, game_state["current_artist"])
    if artist_ws:
        await manager.send_personal_message({"type": "select_phrase_options", "words": words}, artist_ws)
    else:
        # If artist disconnected, skip to next round after a short delay
        await asyncio.sleep(1)
        await start_round(game_code)


async def end_round(game_code: str):
    game_state = manager.game_states.get(game_code)
    if not game_state: return

    full_phrase = " ".join(game_state["selected_phrase"])
    await manager.broadcast(game_code, {"type": "round_end", "full_phrase": full_phrase, "scores": game_state["scores"]})

    if game_state.get("round_timer"): game_state["round_timer"].cancel()

    await asyncio.sleep(5)
    await start_round(game_code)

async def end_game(game_code: str):
    game_state = manager.game_states.get(game_code)
    if not game_state: return

    await manager.broadcast(game_code, {"type": "game_end", "final_scores": game_state["scores"]})

    await asyncio.sleep(2)
    if game_code in manager.active_connections:
        for conn in manager.active_connections[game_code]:
            await conn.close(code=1000)
        del manager.active_connections[game_code]
        del manager.game_states[game_code]

@app.get("/")
async def get_root():
    return {"message": "Vítejte v backendu Koncept Kreslíři!"}
