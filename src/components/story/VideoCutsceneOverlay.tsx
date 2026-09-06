import React, { useState, useEffect, useCallback, useRef } from 'react';
import { VideoCutsceneDefinition, VideoCutsceneId } from '../../game/story/video/videoCutsceneTypes';
import { getVideoCutscene } from '../../game/story/video/videoCutscenes';
import { getLogger } from '../../utils/logger';
import './story.css';

const logger = getLogger('VideoCutsceneOverlay');

export interface VideoCutsceneOverlayProps {
  videoId: VideoCutsceneId;
  onComplete: () => void;
  customDefinition?: VideoCutsceneDefinition;
  isMuted?: boolean;
}

export const VideoCutsceneOverlay: React.FC<VideoCutsceneOverlayProps> = ({
  videoId,
  onComplete,
  customDefinition,
  isMuted = false,
}) => {
  const definition = customDefinition || getVideoCutscene(videoId);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const completedRef = useRef(false);

  const handleFinish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    logger.info(`Video cutscene "${videoId}" finished`);
    onComplete();
  }, [videoId, onComplete]);

  const handleSkip = useCallback(
    (e?: React.SyntheticEvent | KeyboardEvent | MouseEvent) => {
      e?.stopPropagation();
      e?.preventDefault();
      logger.info(`Video cutscene "${videoId}" skipped by user`);
      if (videoRef.current) {
        videoRef.current.pause();
      }
      handleFinish();
    },
    [videoId, handleFinish]
  );

  // Keyboard navigation: Escape key skips video if skippable
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && (definition?.skippable !== false)) {
        e.preventDefault();
        e.stopPropagation();
        handleSkip(e);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [definition?.skippable, handleSkip]);

  // Handle missing definition
  useEffect(() => {
    if (!definition) {
      logger.warn(`Video cutscene "${videoId}" not found in registry`);
      setHasError(true);
      setErrorMessage(`Video cutscene "${videoId}" could not be located.`);
    }
  }, [definition, videoId]);

  const handleVideoEnded = () => {
    logger.info(`Video cutscene "${videoId}" playback ended naturally`);
    handleFinish();
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const mediaError = videoRef.current?.error;
    const msg = mediaError?.message || 'Media source transmission failed or format unsupported.';
    logger.warn(`Video cutscene "${videoId}" error:`, { code: mediaError?.code, message: msg }, e);
    setHasError(true);
    setErrorMessage(msg);
  };

  const isSkippable = definition?.skippable !== false;

  return (
    <div className="video-overlay" data-testid="video-overlay">
      {hasError ? (
        <div className="video-error-container" data-testid="video-error-container">
          <h4 className="video-error-title">Signal Interrupted</h4>
          <p className="video-error-msg">
            {errorMessage || 'Subspace communication link offline.'}
          </p>
          <button
            type="button"
            className="video-skip-btn"
            data-testid="video-error-continue-btn"
            onClick={handleSkip}
          >
            Continue Mission
          </button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            className="video-element"
            data-testid="video-element"
            src={definition?.src}
            poster={definition?.poster}
            preload={definition?.preload ?? 'metadata'}
            autoPlay
            playsInline
            muted={isMuted}
            onEnded={handleVideoEnded}
            onError={handleVideoError}
          />

          {isSkippable && (
            <div className="video-hud-overlay">
              <button
                type="button"
                className="video-skip-btn"
                data-testid="video-skip-btn"
                onClick={handleSkip}
              >
                Skip Transmission (ESC)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
