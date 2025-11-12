import json
import random
import asyncio
from typing import Dict, List, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# CORS middleware to allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Load word packages from JSON file at startup
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

    async def connect(self, websocket: WebSocket, game_code: str, username: str):
        await websocket.accept()
        is_new_game = game_code not in self.active_connections

        if is_new_game:
            self.active_connections[game_code] = []
            default_package = list(WORD_PACKAGES.keys())[0]
            self.game_states[game_code] = {
                "players": [],
                "scores": {},
                "current_round": 0,
                "total_rounds": 3,
                "current_artist": None,
                "selected_phrase": [],
                "masked_phrase": "",
                "host": username,
                "selected_package": default_package # Default package
            }

        self.active_connections[game_code].append(websocket)
        self.game_states[game_code]["players"].append({"username": username, "websocket": websocket})
        self.game_states[game_code]["scores"][username] = 0

        # Notify everyone about the new player
        await self.broadcast(game_code, {
            "type": "player_joined",
            "username": username,
            "players": [{"username": p["username"]} for p in self.game_states[game_code]["players"]],
            "host": self.game_states[game_code]["host"]
        })

        # If it's the host (first player), send the list of available packages
        if self.game_states[game_code]["host"] == username:
             await self.send_personal_message({
                "type": "available_packages",
                "packages": list(WORD_PACKAGES.keys()),
                "selected_package": self.game_states[game_code]["selected_package"]
            }, websocket)

    def disconnect(self, websocket: WebSocket, game_code: str, username: str):
        if game_code in self.active_connections:
            self.active_connections[game_code] = [conn for conn in self.active_connections[game_code] if conn != websocket]
            self.game_states[game_code]["players"] = [p for p in self.game_states[game_code]["players"] if p["username"] != username]
            if username in self.game_states[game_code]["scores"]:
                del self.game_states[game_code]["scores"][username]

            if self.game_states[game_code]["host"] == username and self.game_states[game_code]["players"]:
                self.game_states[game_code]["host"] = self.game_states[game_code]["players"][0]["username"]
                asyncio.create_task(self.broadcast(game_code, {"type": "new_host", "host": self.game_states[game_code]["host"]}))

            asyncio.create_task(self.broadcast(game_code, {"type": "player_left", "username": username, "players": [{"username": p["username"]} for p in self.game_states[game_code]["players"]]}))
            if not self.active_connections[game_code]:
                del self.active_connections[game_code]
                del self.game_states[game_code]

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_json(message)

    async def broadcast(self, game_code: str, message: dict):
        if game_code in self.active_connections:
            for connection in self.active_connections[game_code]:
                await connection.send_json(message)

manager = ConnectionManager()

def get_words_for_round(package_name: str):
    package = WORD_PACKAGES.get(package_name)
    if not package:
        # Fallback to the first package if the selected one doesn't exist
        package = list(WORD_PACKAGES.values())[0]

    return {
        "Vlastnost": random.sample(package["Vlastnost"], min(5, len(package["Vlastnost"]))),
        "Subjekt": random.sample(package["Subjekt"], min(5, len(package["Subjekt"]))),
        "Činnost": random.sample(package["Činnost"], min(5, len(package["Činnost"]))),
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

            if message["type"] == "select_package":
                if game_state["host"] == username:
                    package_name = message.get("package")
                    if package_name in WORD_PACKAGES:
                        game_state["selected_package"] = package_name
                        await manager.broadcast(game_code, {"type": "package_selected", "package": package_name})
                else:
                    await manager.send_personal_message({"type": "error", "message": "Pouze hostitel může měnit balíček slov."}, websocket)

            elif message["type"] == "start_game":
                if game_state["host"] == username:
                    game_state["total_rounds"] = len(game_state["players"]) * 2
                    await start_round(game_code)
                else:
                    await manager.send_personal_message({"type": "error", "message": "Pouze hostitel může spustit hru."}, websocket)

            elif message["type"] == "select_phrase":
                if game_state["current_artist"] == username:
                    selected_phrase = message["phrase"]
                    game_state["selected_phrase"] = selected_phrase
                    masked_phrase = " ".join(["_" * len(word) for word in selected_phrase])
                    game_state["masked_phrase"] = masked_phrase
                    await manager.broadcast(game_code, {"type": "phrase_selected", "masked_phrase": masked_phrase})
                    game_state["round_timer"] = asyncio.create_task(round_timer(game_code, 90))
                else:
                    await manager.send_personal_message({"type": "error", "message": "Nejste umělec pro toto kolo."}, websocket)

            # Other message types (drawing_data, clear_canvas, guess) remain the same...
            elif message["type"] == "drawing_data":
                if game_state["current_artist"] == username:
                    await manager.broadcast(game_code, {"type": "drawing_update", "data": message["data"]})

            elif message["type"] == "clear_canvas":
                 if game_state["current_artist"] == username:
                    await manager.broadcast(game_code, {"type": "canvas_cleared"})

            elif message["type"] == "guess":
                if game_state["current_artist"] != username:
                    selected_phrase = game_state["selected_phrase"]
                    guess = message["guess"].strip().lower()
                    correct_guess = False

                    revealed_phrase_list = game_state["masked_phrase"].split()
                    for i, word in enumerate(selected_phrase):
                        if word.lower() == guess and revealed_phrase_list[i] == "_" * len(word):
                            revealed_phrase_list[i] = word
                            correct_guess = True
                            break

                    if correct_guess:
                        game_state["masked_phrase"] = " ".join(revealed_phrase_list)
                        game_state["scores"][username] += 10
                        if game_state["current_artist"] in game_state["scores"]:
                             game_state["scores"][game_state["current_artist"]] += 5

                        await manager.broadcast(game_code, {
                            "type": "word_guessed",
                            "guesser": username,
                            "word": guess.capitalize(),
                            "revealed_phrase": game_state["masked_phrase"],
                            "scores": game_state["scores"]
                        })
                        if "_" not in game_state["masked_phrase"]:
                            if "round_timer" in game_state and game_state["round_timer"]:
                                game_state["round_timer"].cancel()
                            await end_round(game_code)
                    else:
                        await manager.broadcast(game_code, {"type": "chat_message", "username": username, "message": message["guess"]})
                else:
                    await manager.send_personal_message({"type": "error", "message": "Umělec nemůže hádat."}, websocket)

    except WebSocketDisconnect:
        manager.disconnect(websocket, game_code, username)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket, game_code, username)

async def round_timer(game_code: str, duration: int):
    try:
        await asyncio.sleep(duration)
        if game_code in manager.game_states:
            await end_round(game_code)
    except asyncio.CancelledError:
        pass

async def start_round(game_code: str):
    game_state = manager.game_states.get(game_code)
    if not game_state: return

    game_state["current_round"] += 1
    if game_state["current_round"] > game_state["total_rounds"]:
        await end_game(game_code)
        return

    game_state["selected_phrase"] = []
    game_state["masked_phrase"] = ""

    player_usernames = [p["username"] for p in game_state["players"]]
    if not player_usernames: return
    artist_index = (game_state["current_round"] - 1) % len(player_usernames)
    game_state["current_artist"] = player_usernames[artist_index]

    await manager.broadcast(game_code, {"type": "round_start", "round": game_state["current_round"], "total_rounds": game_state["total_rounds"], "artist": game_state["current_artist"]})

    # Get words from the selected package for the artist
    words = get_words_for_round(game_state["selected_package"])
    artist_ws = next((p["websocket"] for p in game_state["players"] if p["username"] == game_state["current_artist"]), None)
    if artist_ws:
        await manager.send_personal_message({"type": "select_phrase_options", "words": words}, artist_ws)
    else:
        await end_round(game_code)

async def end_round(game_code: str):
    game_state = manager.game_states.get(game_code)
    if not game_state: return

    full_phrase = " ".join(game_state["selected_phrase"])
    await manager.broadcast(game_code, {"type": "round_end", "full_phrase": full_phrase, "scores": game_state["scores"]})

    if "round_timer" in game_state and game_state["round_timer"]:
        game_state["round_timer"].cancel()

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
