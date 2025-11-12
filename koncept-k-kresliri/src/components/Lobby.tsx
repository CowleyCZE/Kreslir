import React from 'react';

interface Player {
  username: string;
}

interface LobbyProps {
  players: Player[];
  gameCode: string;
  isHost: boolean;
  onStartGame: () => void;
}

const Lobby: React.FC<LobbyProps> = ({ players, gameCode, isHost, onStartGame }) => {
  return (
    <div className="flex flex-col items-center p-8 bg-gray-800 rounded-lg shadow-lg w-full max-w-md">
      <h2 className="text-3xl font-bold mb-4">Herní místnost</h2>
      <p className="text-lg mb-2">Kód hry:</p>
      <div className="bg-gray-700 text-yellow-400 font-mono text-2xl p-3 rounded-md mb-6 w-full text-center">
        {gameCode}
      </div>
      <h3 className="text-2xl font-bold mb-4">Hráči ({players.length}):</h3>
      <ul className="w-full mb-6">
        {players.map((player) => (
          <li key={player.username} className="bg-gray-700 p-3 rounded-md mb-2 text-lg">
            {player.username} {player.username === players[0].username ? '(Hostitel)' : ''}
          </li>
        ))}
      </ul>
      {isHost ? (
        <button
          onClick={onStartGame}
          disabled={players.length < 2}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 px-6 rounded-md disabled:bg-gray-600 disabled:cursor-not-allowed"
        >
          {players.length < 2 ? 'Čekání na další hráče...' : 'Spustit hru'}
        </button>
      ) : (
        <p className="text-gray-400">Čeká se, až hostitel spustí hru...</p>
      )}
    </div>
  );
};

export default Lobby;
