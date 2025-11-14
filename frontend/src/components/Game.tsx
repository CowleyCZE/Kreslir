import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatBox, { type ChatMessage } from './ChatBox';
import Canvas from './Canvas';
import WordSelection from './WordSelection';
import GameOver from './GameOver';
import Scoreboard from './Scoreboard';
// import Toolbar from './Toolbar';
import Timer from './Timer';
import GameLobby from './GameLobby';
import Toolbar from './Toolbar';
import { useWebSocket } from './useWebSocket';

export interface Player {
  username: string;
}

interface GameState {
  players: Player[];
  scores: Record<string, number>;
  current_round: number;
  total_rounds: number;
  current_artist: string | null;
  masked_phrase: string;
  full_phrase: string;
  host: string;
  selected_package: string;
  game_started: boolean;
  game_over: boolean;
}

interface GameProps {
  socket: WebSocket;
  username: string;
  gameCode: string;
}

const Game: React.FC<GameProps> = ({ socket, username, gameCode }) => {
  const { lastMessage, sendMessage } = useWebSocket(socket);

  const [gameState, setGameState] = useState<GameState>({
    players: [],
    scores: {},
    current_round: 0,
    total_rounds: 0,
    current_artist: null,
    masked_phrase: '',
    full_phrase: '',
    host: '',
    selected_package: '',
    game_started: false,
    game_over: false,
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [wordOptions, setWordOptions] = useState<Record<string, string[]> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [availablePackages, setAvailablePackages] = useState<string[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<string>('');
  const [pointsAnimation, setPointsAnimation] = useState<{ username: string; points: number; bonus: number } | null>(null);
  // State for drawing tools
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [guessedPlayers, setGuessedPlayers] = useState<Set<string>>(new Set());
  const [roundDuration, setRoundDuration] = useState(0);

  // Mobile UI states
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [mobileShowScores, setMobileShowScores] = useState(false);
  const [canvasFullscreen, setCanvasFullscreen] = useState(false);

  // --- WebSocket Message Handlers ---
  const handlePlayerUpdate = useCallback((message: any) => {
    setGameState((prevState) => ({
      ...prevState,
      players: message.players ?? prevState.players,
      host: message.host ?? prevState.host,
    }));
  }, []);

  const handleRoundStart = useCallback((message: any) => {
    setGameState((prevState) => ({
      ...prevState,
      current_round: message.round,
      total_rounds: message.total_rounds,
      current_artist: message.artist,
      game_started: true,
      masked_phrase: '',
      full_phrase: '',
    }));
    setWordOptions(null);
    setChatMessages([]);
    setRoundDuration(message.duration ?? 90);
    setGuessedPlayers(new Set());
  }, []);

  const handlePhraseSelected = useCallback((message: any) => {
    setGameState((prevState) => ({
      ...prevState,
      masked_phrase: message.masked_phrase ?? prevState.masked_phrase,
      full_phrase: message.full_phrase ?? prevState.full_phrase,
    }));
  }, []);

  const getBonusTierInfo = (bonus: number) => {
    if (bonus >= 50) return { icon: '⚡', name: 'Bleskový bonus' };
    if (bonus >= 30) return { icon: '🥇', name: 'Zlatý bonus' };
    if (bonus >= 15) return { icon: '🥈', name: 'Stříbrný bonus' };
    if (bonus > 0) return { icon: '🥉', name: 'Bronzový bonus' };
    return null;
  };

  const handleWordGuessed = useCallback((message: any) => {
    setGuessedPlayers(prev => new Set(prev).add(message.guesser));

    const speedBonus = message.speed_bonus || 0;
    const bonusInfo = getBonusTierInfo(speedBonus);
    const chatMessageText = bonusInfo
      ? `Uhodl slovo "${message.word}"! (${bonusInfo.icon} ${bonusInfo.name} +${speedBonus} bodů)`
      : `Uhodl slovo "${message.word}"! (+${message.points_earned} bodů)`;

    setChatMessages((prevMessages) => [
      ...prevMessages,
      {
        username: message.guesser,
        message: chatMessageText,
        type: 'correct',
      },
    ]);
    if (message.points_earned) {
      setPointsAnimation({
        username: message.guesser,
        points: message.points_earned,
        bonus: speedBonus,
      });
      setTimeout(() => setPointsAnimation(null), 2000);
    }
    setGameState((prevState) => ({
      ...prevState,
      masked_phrase: message.revealed_phrase,
      scores: message.scores ?? prevState.scores,
    }));
  }, []);

  const handleRoundEnd = useCallback((message: any) => {
    setGameState((prevState) => ({
      ...prevState,
      masked_phrase: message.full_phrase ?? prevState.masked_phrase,
      scores: message.scores ?? prevState.scores,
    }));
    setRoundDuration(0);
  }, []);

  const handleGameEnd = useCallback((message: any) => {
    setGameState((prevState) => ({
      ...prevState,
      scores: message.final_scores ?? prevState.scores,
      game_over: true,
    }));
    setRoundDuration(0);
  }, []);

  const handleDrawingUpdate = useCallback((message: any) => {
    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        const { x0, y0, x1, y1, color, lineWidth } = message.data;
        context.beginPath();
        context.moveTo(x0, y0);
        context.lineTo(x1, y1);
        context.lineWidth = lineWidth;
        context.strokeStyle = color;
        context.stroke();
        context.closePath();
      }
    }
  }, []);

  const handleChatMessage = useCallback((message: any) => {
    setChatMessages((prevMessages) => [...prevMessages, { username: message.username, message: message.message, type: 'guess' }]);
  }, []);

    useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'player_joined':
        case 'player_left':
          handlePlayerUpdate(lastMessage);
          break;
        case 'new_host':
          setGameState((prevState) => ({ ...prevState, host: lastMessage.host }));
          break;
        case 'package_selected':
          setGameState((prevState) => ({ ...prevState, selected_package: lastMessage.package }));
          break;
        case 'round_start':
          handleRoundStart(lastMessage);
          break;
        case 'phrase_selected':
          handlePhraseSelected(lastMessage);
          break;
        case 'word_guessed':
          handleWordGuessed(lastMessage);
          break;
        case 'round_end':
          handleRoundEnd(lastMessage);
          break;
        case 'game_end':
          handleGameEnd(lastMessage);
          break;
        case 'available_packages':
          const currentPackage = lastMessage.selected_package ?? '';
          setAvailablePackages(lastMessage.packages ?? []);
          setGameState((prevState) => ({ ...prevState, selected_package: currentPackage }));
          setSelectedPackage(currentPackage);
          break;
        case 'select_phrase_options':
          setWordOptions(lastMessage.words);
          break;
        case 'drawing_update':
          handleDrawingUpdate(lastMessage);
          break;
        case 'canvas_cleared':
          const canvas = canvasRef.current;
          if (canvas) {
            const context = canvas.getContext('2d');
            context?.clearRect(0, 0, canvas.width, canvas.height);
          }
          break;
        case 'chat_message':
          handleChatMessage(lastMessage);
          break;
      }
    }
  }, [lastMessage, handlePlayerUpdate, handleRoundStart, handlePhraseSelected, handleWordGuessed, handleRoundEnd, handleGameEnd, handleDrawingUpdate, handleChatMessage]);
  const handleSendMessage = useCallback((message: string) => {
    sendMessage({ type: 'guess', guess: message });
  }, [sendMessage]);

  const handleSelectWord = useCallback((phrase: string[]) => {
    sendMessage({ type: 'select_phrase', phrase });
    setWordOptions(null);
  }, [sendMessage]);

  const handleStartGame = useCallback(() => {
    sendMessage({ type: 'start_game' });
  }, [sendMessage]);

  const handleSelectPackage = useCallback((pkg: string) => {
    sendMessage({ type: 'select_package', package: pkg });
  }, [sendMessage]);

  const handleClearCanvas = useCallback(() => {
    sendMessage({ type: 'clear_canvas' });
  }, [sendMessage]);

  const handleColorChange = useCallback((newColor: string) => {
    setColor(newColor);
  }, []);

  const handleBrushSizeChange = useCallback((newSize: number) => {
    setBrushSize(newSize);
  }, []);

  if (!gameState.players.length && !gameState.game_started) {
    return <div>Načítání...</div>;
  }

  return (
    <main className="w-full max-w-7xl mx-auto p-4 bg-gray-700 rounded-2xl shadow-lg flex flex-col md:flex-row gap-4 h-[90vh]">
      {gameState.game_over && <GameOver scores={gameState.scores} />}
      {wordOptions && <WordSelection wordOptions={wordOptions} onSelectWord={handleSelectWord} />}

      {/* Levá část - Plátno a nástroje */}
      <div className="flex flex-col flex-grow w-full md:w-2/3 gap-4">
        <div className="relative flex-grow bg-white rounded-xl shadow-md overflow-hidden">
          {/* Canvas area: allow fullscreen on mobile */}
          <div className={`w-full h-full ${canvasFullscreen ? 'fixed inset-0 z-50 bg-gray-800' : ''}`}>
            <div className={`${canvasFullscreen ? 'w-full h-full' : 'w-full h-[60vh] md:h-full'}`}>
              <Canvas
                ref={canvasRef}
                isArtist={username === gameState.current_artist}
                sendMessage={sendMessage}
                color={color}
                brushSize={brushSize}
              />
            </div>
            {/* Fullscreen close button */}
            {canvasFullscreen && (
              <button onClick={() => setCanvasFullscreen(false)} className="absolute top-4 right-4 z-60 bg-gray-700 text-white px-3 py-2 rounded-md">Zavřít</button>
            )}
          </div>

          {/* Mobile control buttons */}
          <div className="absolute bottom-4 left-4 flex gap-2 md:hidden z-50">
            <button onClick={() => setMobileShowChat(true)} className="bg-blue-600 text-white px-3 py-2 rounded-md shadow">Chat</button>
            <button onClick={() => setMobileShowScores(true)} className="bg-green-600 text-white px-3 py-2 rounded-md shadow">Skóre</button>
            <button onClick={() => setCanvasFullscreen(true)} className="bg-gray-800 text-white px-3 py-2 rounded-md shadow">Plátno</button>
          </div>

          <div className="absolute top-2 right-2 bg-gray-800/50 p-2 rounded-lg text-white hidden md:block">Menu</div>
        </div>
        {username === gameState.current_artist && (
          <div className="flex-shrink-0 bg-gray-600 p-3 rounded-xl shadow-md">
            <Toolbar
              onClearCanvas={handleClearCanvas}
              onColorChange={handleColorChange}
              onBrushSizeChange={handleBrushSizeChange}
              activeColor={color}
              brushSize={brushSize}
            />
          </div>
        )}
      </div>

      {/* Pravá část - Informace o hře, skóre a chat */}
      <aside className="flex flex-col w-full md:w-1/3 bg-gray-600 rounded-xl shadow-lg p-4 gap-4">
        {!gameState.game_started ? (
          <GameLobby
            gameCode={gameCode}
            isHost={username === gameState.host}
            playerCount={gameState.players.length}
            availablePackages={availablePackages}
            selectedPackage={selectedPackage || gameState.selected_package}
            onSelectPackage={handleSelectPackage}
            onStartGame={handleStartGame}
          />
        ) : (
          <div className="flex-shrink-0 text-center bg-gray-700 p-3 rounded-lg">
            <h2 className="text-2xl">
              Kolo: {gameState.current_round}/{gameState.total_rounds}
            </h2>
            <div className="flex justify-between items-center mt-1">
              <p className="text-sm">Kreslí: {gameState.current_artist}</p>
              <Timer initialTime={roundDuration} />
            </div>
            <div className="mt-4 text-2xl font-bold tracking-widest break-words">
              {username === gameState.current_artist && gameState.full_phrase
                ? gameState.full_phrase
                : gameState.masked_phrase}
            </div>
            {/* Points animation */}
            {pointsAnimation && pointsAnimation.username === username && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-bounce z-50">
                <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg text-center">
                  <div className="text-3xl font-bold">+{pointsAnimation.points}</div>
                  <div className="text-sm">bodů!</div>
                  {pointsAnimation.bonus > 0 && (
                    <div className="text-xs mt-1 text-yellow-200">Bonus za rychlost: +{pointsAnimation.bonus}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex-grow flex flex-col bg-gray-700 rounded-lg overflow-hidden min-h-0">
          <Scoreboard
            players={gameState.players}
            scores={gameState.scores}
            currentArtist={gameState.current_artist}
            guessedPlayers={guessedPlayers}
          />
        </div>

        {/* Desktop chat always visible; on mobile we use bottom sheet */}
        <div className="hidden md:block">
          <ChatBox
            messages={chatMessages}
            onSendMessage={handleSendMessage}
            isArtist={username === gameState.current_artist}
          />
        </div>
      </aside>

      {/* Mobile overlays/drawers */}
      {mobileShowChat && (
        <div className="fixed inset-0 z-60 flex items-end md:hidden">
          <div className="w-full bg-gray-800 rounded-t-xl p-3 shadow-xl max-h-[70vh] overflow-auto">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold">Chat</h3>
              <button onClick={() => setMobileShowChat(false)} className="text-gray-300">Zavřít</button>
            </div>
            <ChatBox
              messages={chatMessages}
              onSendMessage={(m) => { handleSendMessage(m); setMobileShowChat(false); }}
              isArtist={username === gameState.current_artist}
            />
          </div>
        </div>
      )}

      {mobileShowScores && (
        <div className="fixed inset-0 z-60 flex items-start justify-end md:hidden">
          <div className="w-full bg-gray-800 p-3 shadow-xl max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold">Skóre</h3>
              <button onClick={() => setMobileShowScores(false)} className="text-gray-300">Zavřít</button>
            </div>
            <Scoreboard
              players={gameState.players}
              scores={gameState.scores}
              currentArtist={gameState.current_artist}
              guessedPlayers={guessedPlayers}
            />
          </div>
        </div>
      )}

    </main>
  );
};

export default Game;
