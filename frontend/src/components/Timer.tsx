import React, { useState, useEffect } from 'react';

interface TimerProps {
  initialTime: number; // in seconds
}

const Timer: React.FC<TimerProps> = ({ initialTime }) => {
  const [timeLeft, setTimeLeft] = useState(initialTime);

  useEffect(() => {
    // Reset timer when initialTime changes (new round)
    setTimeLeft(initialTime);
  }, [initialTime]);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const intervalId = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timeLeft]);

  const getTimerColor = () => {
    if (timeLeft > 75) {
      return 'text-yellow-300'; // Bleskový bonus
    }
    if (timeLeft > 50) {
      return 'text-yellow-400'; // Zlatý bonus
    }
    if (timeLeft > 20) {
      return 'text-gray-300'; // Stříbrný bonus
    }
    if (timeLeft > 10) {
      return 'text-orange-400'; // Bronzový bonus
    }
    return 'text-red-500 animate-pulse'; // Posledních 10 sekund
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return <p className={`text-lg font-bold transition-colors duration-500 ${getTimerColor()}`}>{`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`}</p>;
};

export default Timer;