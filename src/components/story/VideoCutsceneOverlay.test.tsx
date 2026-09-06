import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoCutsceneOverlay } from './VideoCutsceneOverlay';
import { VideoCutsceneDefinition } from '../../game/story/video/videoCutsceneTypes';

const testVideo: VideoCutsceneDefinition = {
  id: 'test-cinematic',
  src: '/cutscenes/test.mp4',
  poster: '/cutscenes/test.jpg',
  skippable: true,
};

describe('VideoCutsceneOverlay', () => {
  it('renders video element with correct attributes', () => {
    const onComplete = vi.fn();
    render(
      <VideoCutsceneOverlay
        videoId="test-cinematic"
        customDefinition={testVideo}
        onComplete={onComplete}
        isMuted={true}
      />
    );

    const video = screen.getByTestId('video-element') as HTMLVideoElement;
    expect(video).toBeDefined();
    expect(video.src).toContain('/cutscenes/test.mp4');
    expect(video.poster).toContain('/cutscenes/test.jpg');
    expect(video.muted).toBe(true);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('completes on video ended event', () => {
    const onComplete = vi.fn();
    render(
      <VideoCutsceneOverlay
        videoId="test-cinematic"
        customDefinition={testVideo}
        onComplete={onComplete}
      />
    );

    const video = screen.getByTestId('video-element');
    fireEvent.ended(video);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('skips on skip button click', () => {
    const onComplete = vi.fn();
    render(
      <VideoCutsceneOverlay
        videoId="test-cinematic"
        customDefinition={testVideo}
        onComplete={onComplete}
      />
    );

    const skipBtn = screen.getByTestId('video-skip-btn');
    fireEvent.click(skipBtn);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('skips on Escape key press', () => {
    const onComplete = vi.fn();
    render(
      <VideoCutsceneOverlay
        videoId="test-cinematic"
        customDefinition={testVideo}
        onComplete={onComplete}
      />
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('is idempotent when ended and skip occur in close succession', () => {
    const onComplete = vi.fn();
    render(
      <VideoCutsceneOverlay
        videoId="test-cinematic"
        customDefinition={testVideo}
        onComplete={onComplete}
      />
    );

    const video = screen.getByTestId('video-element');
    const skipBtn = screen.getByTestId('video-skip-btn');

    fireEvent.ended(video);
    fireEvent.click(skipBtn);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('displays recoverable fallback UI when video fails to load or has error', () => {
    const onComplete = vi.fn();
    render(
      <VideoCutsceneOverlay
        videoId="test-cinematic"
        customDefinition={testVideo}
        onComplete={onComplete}
      />
    );

    const video = screen.getByTestId('video-element');
    fireEvent.error(video);

    expect(screen.getByTestId('video-error-container')).toBeDefined();
    const continueBtn = screen.getByTestId('video-error-continue-btn');
    fireEvent.click(continueBtn);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('handles missing video definition gracefully with recoverable fallback', () => {
    const onComplete = vi.fn();
    render(
      <VideoCutsceneOverlay
        videoId="missing-video-id"
        onComplete={onComplete}
      />
    );

    expect(screen.getByTestId('video-error-container')).toBeDefined();
    fireEvent.click(screen.getByTestId('video-error-continue-btn'));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
