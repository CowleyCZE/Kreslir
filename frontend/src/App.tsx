import { useState, useEffect } from 'react';
import Lobby from './components/Lobby';
import Game from './components/Game';
import Leaderboards from './components/Leaderboards';
import './App.css';

function App() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [username, setUsername] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [inGame, setInGame] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const handleJoinGame = (username: string, gameCode: string) => {
    setUsername(username);
    setGameCode(gameCode.toUpperCase().trim());
    setInGame(true);
    setConnectionError(null);
  };

  const handleCreateGame = (username: string) => {
    const newGameCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    setUsername(username);
    setGameCode(newGameCode);
    setInGame(true);
    setConnectionError(null);
  };

  useEffect(() => {
    if (inGame && username && gameCode) {
      setIsConnecting(true);
      setConnectionError(null);
      
      // Use environment variable for backend URL or fallback to current host so Vite proxy can forward /ws in dev
      const fallbackScheme = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const fallbackHost = window.location.host; // includes port
      const env: any = import.meta;
      const backendWsUrl =
        (env.env && env.env.VITE_BACKEND_WS) || `${fallbackScheme}://${fallbackHost}/ws/${gameCode}/${username}`;

      let ws: WebSocket;
      try {
        ws = new WebSocket(backendWsUrl);
      } catch (err) {
        console.error('WebSocket construction failed:', err);
        setIsConnecting(false);
        setConnectionError('Nepodařilo se vytvořit WebSocket. Zkontrolujte konfiguraci URL.');
        return;
      }

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnecting(false);
        setConnectionError(null);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnecting(false);
        setConnectionError('Chyba připojení k serveru. Zkontrolujte, zda je backend spuštěn.');
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason);
        setIsConnecting(false);
        
        // Only show error if it wasn't a normal closure
        if (event.code !== 1000 && event.code !== 1001) {
          const reason = event.reason || 'Neznámá chyba';
          setConnectionError(reason || 'Připojení bylo ukončeno. Zkuste se znovu připojit.');
        }
        
        // Only reset if it wasn't a normal closure or if we're not already in game
        if (event.code === 1008) {
          // Game already started or other server-side rejection
          setInGame(false);
          setSocket(null);
        } else if (event.code !== 1000) {
          // Unexpected closure
          setTimeout(() => {
            setInGame(false);
            setSocket(null);
          }, 2000);
        }
      };

      setSocket(ws);

      return () => {
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
          ws.close(1000, 'Component unmounting');
        }
      };
    }
  }, [inGame, username, gameCode]);

  return (
    <div className="App bg-gray-800 text-white min-h-screen flex items-center justify-center p-4">
      {!inGame || !socket ? (
        <div className="w-full max-w-5xl">
          <Lobby
            onJoinGame={handleJoinGame}
            onCreateGame={handleCreateGame}
            connectionError={connectionError}
            isConnecting={isConnecting}
            onDismissError={() => setConnectionError(null)}
          />
          <div className="mt-6">
            <Leaderboards />
          </div>
        </div>
      ) : (
        <Game socket={socket} username={username} gameCode={gameCode} />
      )}
    </div>
  );
}

export default App;
