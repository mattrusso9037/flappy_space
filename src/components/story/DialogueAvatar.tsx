import React from 'react';
import { CharacterId, EmotionId } from '../../game/story/characters/characterTypes';
import { getCharacterPortraitAdapter } from './dialogueAvatars';
import './story.css';

export interface DialogueAvatarProps {
  characterId?: CharacterId;
  emotion?: EmotionId;
  className?: string;
}

/**
 * DialogueAvatar Component
 *
 * Dedicated presentation component for character avatars in dialogue overlays.
 * Resolves each character through its presentation adapter. Dialogue content does
 * not need to know whether a character uses a grid, animation, or another renderer.
 */
export const DialogueAvatar: React.FC<DialogueAvatarProps> = ({
  characterId,
  emotion,
  className = '',
}) => {
  if (!characterId) {
    return null;
  }

  const descriptor = getCharacterPortraitAdapter(characterId).resolve(emotion);

  if (descriptor.kind === 'headshot-grid') {
    const label = emotion || characterId;
    return (
      <div
        className={`dialogue-portrait dialogue-portrait--${descriptor.characterId} ${className}`.trim()}
        data-testid="dialogue-portrait"
        data-character-id={descriptor.characterId}
        data-portrait-id={label}
      >
        <div
          className="dialogue-portrait-headshot"
          data-testid="dialogue-portrait-headshot"
          style={{
            backgroundImage: `url(${descriptor.assetUrl})`,
            backgroundPosition: descriptor.coordinates.backgroundPosition,
          }}
          aria-hidden="true"
        />
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  if (descriptor.kind === 'ai-core') {
    return (
      <div
        className={`dialogue-portrait dialogue-portrait--ai ${className}`.trim()}
        data-testid="dialogue-portrait"
        data-character-id={descriptor.characterId}
        data-portrait-id={descriptor.emotion}
      >
        <div className="dialogue-portrait-ai" aria-hidden="true">
          <span className="ai-core-ring" />
          <span className="ai-core-inner" />
          <span className="ai-waveform-wrap">
            <span className="ai-wave ai-wave-1" />
            <span className="ai-wave ai-wave-2" />
            <span className="ai-wave ai-wave-3" />
          </span>
        </div>
        <span className="sr-only">{emotion || characterId}</span>
      </div>
    );
  }

  return null;
};
