import React, { useState } from 'react';

interface GameLobbyProps {
  gameCode: string;
  isHost: boolean;
  playerCount: number;
  availablePackages: string[];
  selectedPackage: string;
  onSelectPackage: (pkg: string) => void;
  onStartGame: () => void;
}

const GameLobby: React.FC<GameLobbyProps> = ({
  gameCode,
  isHost,
  playerCount,
  availablePackages,
  selectedPackage,
  onSelectPackage,
  onStartGame,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(gameCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy game code:', err);
    }
  };

  return (
    <div className="flex flex-col h-full p-4 bg-gray-700 rounded-lg">
      <h2 className="text-2xl font-bold text-center mb-6">Čekání na hráče...</h2>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-400 mb-2">Kód pro připojení:</label>
        <div className="flex items-center gap-2">
          <div className="flex-grow bg-gray-800 text-white text-2xl font-mono tracking-widest text-center p-3 rounded-lg">
            {gameCode}
          </div>
          <button
            onClick={handleCopyCode}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            title="Kopírovat kód"
          >
            {copied ? '✓' : '📋'}
          </button>
        </div>
        {copied && <p className="text-green-400 text-xs text-center mt-2">Zkopírováno!</p>}
      </div>

      {isHost && (
        <div className="mb-6">
          <label htmlFor="package-select" className="block text-sm font-medium text-gray-400 mb-2">
            Balíček slov:
          </label>
          <select
            id="package-select"
            value={selectedPackage}
            onChange={(e) => onSelectPackage(e.target.value)}
            className="w-full bg-gray-800 border-2 border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {availablePackages.map((pkg) => (
              <option key={pkg} value={pkg}>{pkg}</option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-auto">
        {isHost && (
          <button onClick={onStartGame} disabled={playerCount < 2} className="w-full px-4 py-3 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed font-bold text-lg transition-colors">
            {playerCount < 2 ? 'Čeká se na další hráče...' : 'Spustit hru'}
          </button>
        )}
      </div>
    </div>
  );
};

export default GameLobby;