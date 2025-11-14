import React from 'react';
import { FaPencilAlt, FaCheck, FaQuestion } from 'react-icons/fa';

export interface Player {
  username: string;
  state?: 'drawing' | 'guessing' | 'guessed' | 'idle';
}

interface ScoreboardProps {
  players: Player[];
  scores: Record<string, number>;
  currentArtist: string | null;
  guessedPlayers: Set<string>;
}

const getPlayerState = (
  playerUsername: string,
  currentArtist: string | null,
  guessedPlayers: Set<string>
): Player['state'] => {
  if (playerUsername === currentArtist) return 'drawing';
  if (guessedPlayers.has(playerUsername)) return 'guessed';
  return 'guessing';
};

const PlayerIcon: React.FC<{ state: Player['state'] }> = ({ state }) => {
  switch (state) {
    case 'drawing':
      return <FaPencilAlt className="text-yellow-400" title="Kreslí" />;
    case 'guessed':
      return <FaCheck className="text-green-400" title="Uhodl" />;
    case 'guessing':
      return (
        <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse" title="Hádá"></div>
      );
    default:
      return <FaQuestion className="text-gray-400" title="Čeká" />;
  }
};

const Scoreboard: React.FC<ScoreboardProps> = ({ players, scores, currentArtist, guessedPlayers }) => {
  const sortedPlayers = [...players].sort((a, b) => (scores[b.username] || 0) - (scores[a.username] || 0));

  return (
    <div className="flex flex-col bg-gray-700 rounded-lg overflow-hidden min-h-0">
      <h2 className="text-lg font-bold p-3 border-b border-gray-600 text-gray-200">Skóre</h2>
      <div className="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-2">
        {sortedPlayers.map((player) => {
          const playerState = getPlayerState(player.username, currentArtist, guessedPlayers);
          return (
            <div
              key={player.username}
              className="flex items-center justify-between bg-gray-600/50 p-2.5 rounded-lg shadow-sm transition-all duration-200 hover:bg-gray-600"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center text-lg">
                  <PlayerIcon state={playerState} />
                </div>
                <span className="font-medium text-white">{player.username}</span>
              </div>
              <span className="font-bold text-lg text-gray-300">
                {scores[player.username] || 0}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Scoreboard;