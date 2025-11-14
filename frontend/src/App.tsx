import React, { useState, useEffect } from 'react';
import Lobby from './components/Lobby';
import Game from './components/Game';
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
      
      // Use environment variable for backend URL or fallback to localhost:8000
      const backendWsUrl =
        import.meta.env.VITE_BACKEND_WS ||
        `ws://${window.location.hostname}:8000/ws/${gameCode}/${username}`;
      
      const ws = new WebSocket(backendWsUrl);

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
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close(1000, 'Component unmounting');
        }
      };
    }
  }, [inGame, username, gameCode]);

  return (
    <div className="App bg-gray-800 text-white min-h-screen flex items-center justify-center p-4">
      {!inGame || !socket ? (
        <Lobby
          onJoinGame={handleJoinGame}
          onCreateGame={handleCreateGame}
          connectionError={connectionError}
          isConnecting={isConnecting}
          onDismissError={() => setConnectionError(null)}
        />
      ) : (
        <Game socket={socket} username={username} gameCode={gameCode} />
      )}
    </div>
  );
}

export default App;
