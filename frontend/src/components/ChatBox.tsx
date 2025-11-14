import React, { useState, useEffect, useRef } from 'react';
import { FaUser, FaCheckCircle, FaInfoCircle } from 'react-icons/fa';

export interface ChatMessage {
  message: string;
  username?: string;
  type: 'guess' | 'correct' | 'system';
  guessedWord?: string;
  pointsEarned?: number;
  speedBonus?: number;
}

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isArtist: boolean;
}

const ChatBox: React.FC<ChatBoxProps> = ({ messages, onSendMessage, isArtist }) => {
  const [guess, setGuess] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleGuessSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guess.trim() && !isArtist) {
      onSendMessage(guess);
      setGuess('');
    }
  };

  const MessageIcon: React.FC<{ type: ChatMessage['type'] }> = ({ type }) => {
    switch (type) {
      case 'correct':
        return <FaCheckCircle className="text-green-400" />;
      case 'system':
        return <FaInfoCircle className="text-blue-400" />;
      default:
        return <FaUser className="text-gray-400" />;
    }
  };

  return (
    <div className="flex-grow flex flex-col bg-gray-700 rounded-lg overflow-hidden min-h-0">
      {/* Message list */}
      <div className="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="text-gray-400 text-sm text-center py-4 italic">
            Chat je zatím prázdný...
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 text-sm ${
                msg.type === 'system' ? 'text-gray-400 italic' : ''
              } ${
                msg.type === 'correct' ? 'bg-green-500/20 p-2 rounded-md' : ''
              }`}
            >
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center mt-0.5">
                <MessageIcon type={msg.type} />
              </div>
              <div>
                {msg.username && <span className="font-bold text-gray-300">{msg.username}: </span>}
                <span className={msg.type === 'correct' ? 'text-green-300 font-semibold' : 'text-gray-200'}>
                  {msg.message}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input form */}
      <form onSubmit={handleGuessSubmit} className="p-2 border-t border-gray-600">
        <input
          type="text"
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          className="w-full bg-gray-800 border border-gray-500 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          placeholder={isArtist ? 'Jsi umělec, nemůžeš hádat.' : 'Napiš svůj tip...'}
          disabled={isArtist}
          autoFocus={!isArtist}
        />
      </form>
    </div>
  );
};

export default ChatBox;
