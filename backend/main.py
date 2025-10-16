import json
import random
import asyncio
from typing import Dict, List, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware

from openai import OpenAI

# Initialize OpenAI client (Gemini API)
client = OpenAI()

app = FastAPI()

# CORS middleware to allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.game_states: Dict[str, Dict[str, Any]] = {}

    async def connect(self, websocket: WebSocket, game_code: str, username: str):
        await websocket.accept()
        if game_code not in self.active_connections:
            self.active_connections[game_code] = []
            self.game_states[game_code] = {
                "players": [],
                "scores": {},
                "current_round": 0,
                "current_artist": None,
                "phrase_options": None,
                "selected_phrase": [],
                "masked_phrase": "",
                "drawing_data": [],
                "chat_messages": [],
                "host": username
            }
        self.active_connections[game_code].append(websocket)
        self.game_states[game_code]["players"].append({"username": username, "websocket": websocket})
        self.game_states[game_code]["scores"][username] = 0
        await self.broadcast(game_code, {"type": "player_joined", "username": username, "players": [{"username": p["username"]} for p in self.game_states[game_code]["players"]]})

    def disconnect(self, websocket: WebSocket, game_code: str, username: str):
        if game_code in self.active_connections:
            self.active_connections[game_code].remove(websocket)
            self.game_states[game_code]["players"] = [p for p in self.game_states[game_code]["players"] if p["username"] != username]
            del self.game_states[game_code]["scores"][username]
            asyncio.create_task(self.broadcast(game_code, {"type": "player_left", "username": username, "players": [{"username": p["username"]} for p in self.game_states[game_code]["players"]] }))
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

async def generate_words_with_gemini():
    prompt = "Generate three lists of words for a drawing game. Each list should contain 5 words. The categories are: 'Vlastnost' (Adjective), 'Subjekt' (Noun), and 'Činnost' (Verb phrase). Format the output as a JSON object with keys 'Vlastnost', 'Subjekt', 'Činnost'. Example: {'Vlastnost': ['Vzteklý', 'Elegantní'], 'Subjekt': ['Klaun', 'Velryba'], 'Činnost': ['Peče dort', 'Hraje golf']}. Make sure the words are creative and suitable for drawing."
    try:
        response = client.chat.completions.create(
            model="gemini-2.5-flash",
            messages=[
                {"role": "user", "content": prompt}
            ],
            response_format={ "type": "json_object" }
        )
        words = json.loads(response.choices[0].message.content)
        return words
    except Exception as e:
        print(f"Error generating words with Gemini: {e}")
        # Fallback words
        return {
            "Vlastnost": ["Vzteklý", "Elegantní", "Líný", "Šťastný", "Smutný"],
            "Subjekt": ["Klaun", "Velryba", "Astronaut", "Robot", "Kočka"],
            "Činnost": ["Peče dort", "Hraje golf", "Tančí", "Spí", "Jí banán"]
        }

@app.websocket("/ws/{game_code}/{username}")
async def websocket_endpoint(websocket: WebSocket, game_code: str, username: str):
    await manager.connect(websocket, game_code, username)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message["type"] == "start_game":
                if manager.game_states[game_code]["host"] == username:
                    manager.game_states[game_code]["current_round"] = 1
                    await start_round(game_code)
                else:
                    await manager.send_personal_message({"type": "error", "message": "Pouze hostitel může spustit hru."}, websocket)

            elif message["type"] == "select_phrase":
                if manager.game_states[game_code]["current_artist"] == username:
                    manager.game_states[game_code]["selected_phrase"] = message["phrase"]
                    full_phrase = " ".join(message["phrase"])
                    masked_phrase = " ".join(["_" * len(word) for word in message["phrase"]])
                    manager.game_states[game_code]["masked_phrase"] = masked_phrase
                    await manager.broadcast(game_code, {"type": "phrase_selected", "masked_phrase": masked_phrase})
                else:
                    await manager.send_personal_message({"type": "error", "message": "Nejste umělec pro toto kolo."}, websocket)

            elif message["type"] == "drawing_data":
                if manager.game_states[game_code]["current_artist"] == username:
                    manager.game_states[game_code]["drawing_data"].append(message["data"])
                    await manager.broadcast(game_code, {"type": "drawing_update", "data": message["data"]})

            elif message["type"] == "guess":
                if manager.game_states[game_code]["current_artist"] != username:
                    full_phrase = " ".join(manager.game_states[game_code]["selected_phrase"])
                    guess = message["guess"].lower()
                    if guess in [word.lower() for word in manager.game_states[game_code]["selected_phrase"]]:
                        # Reveal the guessed word
                        revealed_phrase_list = manager.game_states[game_code]["masked_phrase"].split()
                        original_phrase_list = manager.game_states[game_code]["selected_phrase"]
                        for i, word in enumerate(original_phrase_list):
                            if word.lower() == guess:
                                revealed_phrase_list[i] = word
                        manager.game_states[game_code]["masked_phrase"] = " ".join(revealed_phrase_list)

                        # Update scores (simple scoring for now)
                        manager.game_states[game_code]["scores"][username] += 10
                        manager.game_states[game_code]["scores"][manager.game_states[game_code]["current_artist"]] += 5

                        await manager.broadcast(game_code, {
                            "type": "word_guessed",
                            "guesser": username,
                            "word": guess,
                            "revealed_phrase": manager.game_states[game_code]["masked_phrase"],
                            "scores": manager.game_states[game_code]["scores"]
                        })
                        if "_" not in manager.game_states[game_code]["masked_phrase"]:
                            await end_round(game_code, full_phrase)
                    else:
                        await manager.broadcast(game_code, {"type": "chat_message", "username": username, "message": message["guess"]})
                else:
                    await manager.send_personal_message({"type": "error", "message": "Umělec nemůže hádat."}, websocket)

            elif message["type"] == "chat_message":
                await manager.broadcast(game_code, {"type": "chat_message", "username": username, "message": message["message"]})

    except WebSocketDisconnect:
        manager.disconnect(websocket, game_code, username)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket, game_code, username)

async def start_round(game_code: str):
    game_state = manager.game_states[game_code]
    game_state["current_round"] += 1
    if game_state["current_round"] > 3: # Max 3 rounds for now
        await end_game(game_code)
        return

    # Select next artist
    player_usernames = [p["username"] for p in game_state["players"]]
    current_artist_index = (game_state["current_round"] - 1) % len(player_usernames)
    game_state["current_artist"] = player_usernames[current_artist_index]
    game_state["drawing_data"] = []
    game_state["selected_phrase"] = []
    game_state["masked_phrase"] = ""

    await manager.broadcast(game_code, {"type": "round_start", "round": game_state["current_round"], "artist": game_state["current_artist"]})

    # Generate words for the artist
    words = await generate_words_with_gemini()
    for player_ws in game_state["players"]:
        if player_ws["username"] == game_state["current_artist"]:
            await manager.send_personal_message({"type": "select_phrase_options", "words": words}, player_ws["websocket"])
            break

    # Start timer for the round
    await asyncio.sleep(90) # Drawing time
    if game_state["masked_phrase"] != "": # If phrase was selected
        await end_round(game_code, " ".join(game_state["selected_phrase"])) # End round if time runs out

async def end_round(game_code: str, full_phrase: str):
    game_state = manager.game_states[game_code]
    await manager.broadcast(game_code, {"type": "round_end", "full_phrase": full_phrase, "scores": game_state["scores"]})
    await asyncio.sleep(5) # Pause before next round
    await start_round(game_code)

async def end_game(game_code: str):
    game_state = manager.game_states[game_code]
    await manager.broadcast(game_code, {"type": "game_end", "final_scores": game_state["scores"]})
    # Clean up game state
    if game_code in manager.active_connections:
        for connection in manager.active_connections[game_code]:
            await connection.close()
        del manager.active_connections[game_code]
        del manager.game_states[game_code]

@app.get("/")
async def get_root():
    return {"message": "Welcome to Koncept Kreslíři Backend!"}

