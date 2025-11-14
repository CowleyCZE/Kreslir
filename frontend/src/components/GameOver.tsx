import React from 'react';

interface GameOverProps {
  scores: Record<string, number>;
}

const GameOver: React.FC<GameOverProps> = ({ scores }) => {
  const sortedScores = Object.entries(scores).sort(([, a], [, b]) => b - a);

  return (
    <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-700 rounded-2xl shadow-xl p-8 w-full max-w-md text-white text-center">
        <h2 className="text-4xl font-bold mb-2">Konec hry!</h2>
        {sortedScores.length > 0 && (
          <p className="text-lg text-yellow-300 mb-6">
            🏆 Vítězem je <span className="font-bold">{sortedScores[0][0]}</span>! 🏆
          </p>
        )}
        <h3 className="text-xl font-semibold mb-4 text-gray-300">Konečné skóre:</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
          {sortedScores.map(([username, score], index) => (
            <div
              key={username}
              className="flex justify-between items-center bg-gray-600/80 p-3 rounded-lg"
            >
              <span className="font-medium text-lg">
                {index + 1}. {username}
              </span>
              <span className="font-bold text-xl text-gray-200">{score}</span>
            </div>
          ))}
        </div>
        <button onClick={() => window.location.reload()} className="mt-8 w-full px-4 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 font-bold text-lg transition-colors">
          Hrát znovu
        </button>
      </div>
    </div>
  );
};

export default GameOver;
