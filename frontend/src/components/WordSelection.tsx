import React, { useMemo, useState } from 'react';

interface WordSelectionProps {
  wordOptions: any;
  onSelectWord: (phrase: string[]) => void;
}

const WordSelection: React.FC<WordSelectionProps> = ({ wordOptions, onSelectWord }) => {
  if (!wordOptions) return null;

  const [selection, setSelection] = useState<Record<string, string>>({});

  const categories = useMemo(() => Object.keys(wordOptions), [wordOptions]);
  const allChosen = categories.every((category) => selection[category]);

  const handleConfirm = () => {
    if (!allChosen) return;
    const orderedSelection = categories.map((category) => selection[category]);
    onSelectWord(orderedSelection);
    setSelection({});
  };

  const handleWordClick = (category: string, word: string) => {
    setSelection((prev) => {
      // If the same word is clicked again, unselect it
      if (prev[category] === word) {
        const { [category]: _, ...rest } = prev;
        return rest;
      }
      // Otherwise, select the new word
      return { ...prev, [category]: word };
    });
  };

  return (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-700 rounded-2xl shadow-xl p-8 w-full max-w-2xl text-white">
        <h3 className="text-3xl font-bold mb-6 text-center">Vyber si frázi</h3>
        <div className="space-y-6">
          {Object.entries(wordOptions).map(([category, words]) => (
            <div key={category}>
              <h4 className="font-semibold text-lg mb-3 text-gray-300 capitalize border-b-2 border-gray-600 pb-2">
                {category}
              </h4>
              <div className="flex flex-wrap gap-3">
                {(words as string[]).map((word: string) => (
                  <button
                    key={word}
                    onClick={() => handleWordClick(category, word)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      selection[category] === word
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400 scale-105'
                        : 'bg-gray-800 hover:bg-gray-600'
                    }`}
                  >
                    {word}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={handleConfirm}
          disabled={!allChosen}
          className="mt-8 w-full px-4 py-3 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed font-bold text-lg transition-colors"
        >
          Potvrdit frázi
        </button>
      </div>
    </div>
  );
};

export default WordSelection;
