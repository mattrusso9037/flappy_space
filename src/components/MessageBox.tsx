import React from 'react';

interface MessageBoxProps {
  message: string;
  isVisible: boolean;
  onStartGame?: () => void;
}

const MessageBox: React.FC<MessageBoxProps> = ({ message, isVisible, onStartGame }) => {
  if (!isVisible) return null;
  
  return (
    <div className="message-box">
      <div className="message-content">
        <h2>{message}</h2>
        
        {onStartGame && (
          <button 
            onClick={onStartGame}
            className="start-button"
          >
            Start Game
          </button>
        )}
      </div>
    </div>
  );
};

export default MessageBox; 