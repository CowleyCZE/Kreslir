import React, { useState } from 'react';

interface LobbyProps {
  onJoinGame: (username: string, gameCode: string) => void;
  onCreateGame: (username: string) => void;
  connectionError?: string | null;
  isConnecting?: boolean;
  onDismissError?: () => void;
}

const Lobby: React.FC<LobbyProps> = ({
  onJoinGame,
  onCreateGame,
  connectionError,
  isConnecting = false,
  onDismissError,
}) => {
  const [username, setUsername] = useState('');
  const [gameCode, setGameCode] = useState('');

  const handleJoin = () => {
    if (username.trim() && gameCode.trim()) {
      onJoinGame(username, gameCode);
    }
  };

  const handleCreate = () => {
    if (username.trim()) {
      onCreateGame(username);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-gray-700 rounded-2xl shadow-xl p-8">
        <h1 className="mb-6 text-4xl font-bold text-center text-white tracking-wider">
          Kreslíři
        </h1>

        {isConnecting && (
          <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-center justify-center gap-3 text-blue-200">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-300"></div>
              <span className="text-sm font-medium">Připojování...</span>
            </div>
          </div>
        )}

        {connectionError && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm text-red-200">{connectionError}</p>
              {onDismissError && (
                <button
                  onClick={onDismissError}
                  className="text-red-300 hover:text-white font-bold text-xl leading-none"
                  title="Zavřít"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        )}

        <div className="space-y-6">
          <input
            type="text"
            placeholder="Zadejte své jméno"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-gray-800 border-2 border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />
          <div className="flex items-center">
            <input
              type="text"
              placeholder="Kód hry"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.toUpperCase())}
              className="w-full bg-gray-800 border-2 border-gray-600 rounded-l-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
            <button
              onClick={handleJoin}
              disabled={!username.trim() || !gameCode.trim() || isConnecting}
              className="px-6 py-3 text-white bg-blue-600 rounded-r-lg hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed font-semibold transition-colors"
            >
              Připojit
            </button>
          </div>
          <div className="relative flex items-center">
            <div className="flex-grow border-t border-gray-600"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-sm">NEBO</span>
            <div className="flex-grow border-t border-gray-600"></div>
          </div>
          <button
            onClick={handleCreate}
            disabled={!username.trim() || isConnecting}
            className="w-full px-4 py-3 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed font-bold text-lg transition-colors"
          >
            Vytvořit novou hru
          </button>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
