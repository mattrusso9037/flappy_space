import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  DialogueDefinition,
  DialogueId,
  DialogueVariables,
  resolveDialogueText,
  resolveDialogueSpeaker,
} from '../../game/story/dialogue/dialogueTypes';
import { getDialogue } from '../../game/story/dialogue/dialogues';
import { getUseToolKeyLabel } from '../../game/inputManager';
import { getLogger } from '../../utils/logger';
import { DialogueAvatar } from './DialogueAvatar';
import './story.css';

const logger = getLogger('DialogueOverlay');

export interface DialogueOverlayProps {
  dialogueId: DialogueId;
  onComplete: () => void;
  customDefinition?: DialogueDefinition;
  variables?: DialogueVariables;
}

export const DialogueOverlay: React.FC<DialogueOverlayProps> = ({
  dialogueId,
  onComplete,
  customDefinition,
  variables,
}) => {
  const definition = customDefinition || getDialogue(dialogueId);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    setCurrentLineIndex(0);
    completedRef.current = false;
  }, [dialogueId, customDefinition]);

  const handleFinish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    logger.info(`Dialogue "${dialogueId}" completed`);
    onComplete();
  }, [dialogueId, onComplete]);

  const resolvedVariables = {
    useToolKey: getUseToolKeyLabel(),
    ...variables,
  };

  useEffect(() => {
    if (!definition || definition.lines.length === 0) {
      logger.warn(`Dialogue "${dialogueId}" definition not found or empty, skipping`);
      handleFinish();
    }
  }, [definition, dialogueId, handleFinish]);

  const handleAdvance = useCallback(
    (e?: React.SyntheticEvent | KeyboardEvent | MouseEvent) => {
      e?.stopPropagation();
      e?.preventDefault();

      if (!definition) {
        handleFinish();
        return;
      }

      if (currentLineIndex < definition.lines.length - 1) {
        setCurrentLineIndex(prev => prev + 1);
      } else {
        handleFinish();
      }
    },
    [currentLineIndex, definition, handleFinish]
  );

  const handleSkip = useCallback(
    (e?: React.SyntheticEvent | KeyboardEvent | MouseEvent) => {
      e?.stopPropagation();
      e?.preventDefault();
      logger.info(`Dialogue "${dialogueId}" skipped by user`);
      handleFinish();
    },
    [dialogueId, handleFinish]
  );

  // Keyboard navigation: Space/Enter advances line; Escape skips entire dialogue
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        handleAdvance(e);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleSkip(e);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [handleAdvance, handleSkip]);

  if (!definition || definition.lines.length === 0) {
    return null;
  }

  const activeLineIndex = Math.min(currentLineIndex, definition.lines.length - 1);
  const currentLine = definition.lines[activeLineIndex];

  return (
    <div
      className="dialogue-overlay"
      data-testid="dialogue-overlay"
      onClick={handleAdvance}
      onTouchStart={e => {
        e.preventDefault();
        e.stopPropagation();
        handleAdvance();
      }}
    >
      <div className="dialogue-frame" onClick={e => e.stopPropagation()}>
        <div className="dialogue-header">
          <div className="dialogue-speaker-wrap">
            <span className="dialogue-status-dot" aria-hidden="true" />
            <span className="dialogue-speaker" data-testid="dialogue-speaker">
              {resolveDialogueSpeaker(currentLine.characterId, variables)}
            </span>
          </div>
          <span className="dialogue-counter" data-testid="dialogue-counter">
            {activeLineIndex + 1} / {definition.lines.length}
          </span>
        </div>

        <div className="dialogue-body">
          {currentLine.characterId ? (
            <DialogueAvatar
              characterId={currentLine.characterId}
              emotion={currentLine.emotion}
            />
          ) : null}
          <p className="dialogue-text" data-testid="dialogue-text">
            {resolveDialogueText(currentLine.text, resolvedVariables)}
          </p>
        </div>

        <div className="dialogue-footer">
          <span className="dialogue-advance-prompt">
            Press <kbd>SPACE</kbd> or <kbd>ENTER</kbd> to continue
          </span>
          <button
            type="button"
            className="dialogue-skip-btn"
            data-testid="dialogue-skip-btn"
            onClick={handleSkip}
          >
            Skip (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};
