import React from 'react';

const BALLS = ['⚽', '🏏', '🏐', '🏀'];

const LoadingSpinner = ({ fullScreen = true, message = 'Loading...' }) => {
  const [ballIdx, setBallIdx] = React.useState(0);

  React.useEffect(() => {
    const t = setInterval(() => setBallIdx(i => (i + 1) % BALLS.length), 600);
    return () => clearInterval(t);
  }, []);

  const content = (
    <div className="flex flex-col items-center gap-4">
      <span className="text-5xl animate-bounce-ball select-none">{BALLS[ballIdx]}</span>
      <p className="text-gray-500 text-sm font-medium animate-pulse">{message}</p>
    </div>
  );

  if (!fullScreen) return content;

  return (
    <div className="flex items-center justify-center py-20">
      {content}
    </div>
  );
};

export default LoadingSpinner;
