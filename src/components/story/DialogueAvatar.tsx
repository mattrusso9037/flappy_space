import React from 'react';
import { CharacterId, PortraitId } from '../../game/story/characters/characterTypes';
import {
  getAstronautHeadshotCoordinates,
  getAstronautHeadshotUrl,
} from './dialogueAvatars';
import './story.css';

export interface DialogueAvatarProps {
  characterId?: CharacterId;
  portraitId?: PortraitId;
  className?: string;
}

/**
 * DialogueAvatar Component
 *
 * Dedicated presentation component for character avatars in dialogue overlays.
 * Receives the explicit characterId ('astronaut' | 'ai') and optional emotion portraitId.
 */
export const DialogueAvatar: React.FC<DialogueAvatarProps> = ({
  characterId,
  portraitId,
  className = '',
}) => {
  if (!characterId) {
    return null;
  }

  if (characterId === 'astronaut') {
    const coords = getAstronautHeadshotCoordinates(portraitId);
    const headshotUrl = getAstronautHeadshotUrl();
    const label = portraitId || 'astronaut';
    return (
      <div
        className={`dialogue-portrait dialogue-portrait--astronaut ${className}`.trim()}
        data-testid="dialogue-portrait"
        data-character-id="astronaut"
        data-portrait-id={label}
      >
        <div
          className="dialogue-portrait-headshot"
          data-testid="dialogue-portrait-headshot"
          style={{
            backgroundImage: `url(${headshotUrl})`,
            backgroundPosition: coords.backgroundPosition,
          }}
          aria-hidden="true"
        />
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  if (characterId === 'ai') {
    return (
      <div
        className={`dialogue-portrait dialogue-portrait--ai ${className}`.trim()}
        data-testid="dialogue-portrait"
        data-character-id="ai"
        data-portrait-id="ai"
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
        <span className="sr-only">ai</span>
      </div>
    );
  }

  return null;
};
