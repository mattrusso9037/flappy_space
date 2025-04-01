import React, { useEffect, useState } from 'react';

interface LevelMessageProps {
  isVisible: boolean;
  level: number;
}

const LevelMessage: React.FC<LevelMessageProps> = ({ isVisible, level }) => {
  const [opacity, setOpacity] = useState(0);
  
  useEffect(() => {
    if (isVisible) {
      // Fade in
      setOpacity(1);
      
      // Fade out after 2 seconds
      const timer = setTimeout(() => {
        setOpacity(0);
      }, 2000);
      
      return () => clearTimeout(timer);
    } else {
      setOpacity(0);
    }
  }, [isVisible]);
  
  if (!isVisible && opacity === 0) return null;
  
  return (
    <div 
      className="level-message"
      style={{ 
        opacity,
        transition: 'opacity 0.5s ease-in-out'
      }}
    >
      <div className="level-message-content">
        <h2>Level {level} Complete!</h2>
        <p>Warping to next level...</p>
      </div>
    </div>
  );
};

export default LevelMessage; 