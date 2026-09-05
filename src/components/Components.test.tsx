import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MessageBox from './MessageBox';
import Button from './Button';
import Controls from './Controls';
import LevelMessage from './LevelMessage';

describe('UI Components', () => {
  describe('MessageBox', () => {
    it('does not render when isVisible is false', () => {
      const { container } = render(
        <MessageBox message="Game Over" isVisible={false} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders message and start button when visible', () => {
      const onStart = vi.fn();
      render(
        <MessageBox message="Game Over" isVisible={true} onStartGame={onStart} />
      );

      expect(screen.getByText('Game Over')).toBeInTheDocument();
      const btn = screen.getByRole('button', { name: /start game/i });
      expect(btn).toBeInTheDocument();

      fireEvent.click(btn);
      expect(onStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('Button', () => {
    it('applies proper classes for variant and size', () => {
      render(
        <Button variant="danger" size="large">
          Delete
        </Button>
      );
      const btn = screen.getByRole('button', { name: /delete/i });
      expect(btn).toHaveClass('button', 'button-danger', 'button-large');
    });

    it('handles click events', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click Me</Button>);
      fireEvent.click(screen.getByRole('button', { name: /click me/i }));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Controls', () => {
    it('renders Start Game when gameStarted is false', () => {
      const onFlap = vi.fn();
      const onReset = vi.fn();
      render(
        <Controls gameStarted={false} onFlap={onFlap} onReset={onReset} />
      );

      const startBtn = screen.getByRole('button', { name: /start game/i });
      expect(startBtn).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();

      fireEvent.click(startBtn);
      expect(onReset).toHaveBeenCalledTimes(1);
      expect(onFlap).not.toHaveBeenCalled();
    });

    it('renders Boost and Retry when gameStarted is true', () => {
      const onFlap = vi.fn();
      const onReset = vi.fn();
      render(
        <Controls gameStarted={true} onFlap={onFlap} onReset={onReset} />
      );

      const boostBtn = screen.getByRole('button', { name: /boost/i });
      const retryBtn = screen.getByRole('button', { name: /retry/i });
      expect(boostBtn).toBeInTheDocument();
      expect(retryBtn).toBeInTheDocument();

      fireEvent.click(boostBtn);
      expect(onFlap).toHaveBeenCalledTimes(1);

      fireEvent.click(retryBtn);
      expect(onReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('LevelMessage', () => {
    it('does not render when isVisible is false', () => {
      const { container } = render(<LevelMessage isVisible={false} level={2} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders level completion text when isVisible is true', () => {
      render(<LevelMessage isVisible={true} level={3} />);
      expect(screen.getByText('Level 3 Complete!')).toBeInTheDocument();
      expect(screen.getByText('Warping to next level...')).toBeInTheDocument();
    });
  });
});
