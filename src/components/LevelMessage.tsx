import React from 'react';

interface LevelMessageProps { isVisible: boolean; level: number }

/** Optional shell view. Visibility is owned by the caller, never a wall-clock timer. */
const LevelMessage: React.FC<LevelMessageProps> = ({ isVisible, level }) => {
  if (!isVisible) return null;
  return (
    <div className="level-message" role="status">
      <div className="level-message-content">
        <h2>Level {level} Complete!</h2>
        <p>Warping to next level...</p>
      </div>
    </div>
  );
};
export default LevelMessage;
