import { CutsceneDefinition, CutsceneStep, CameraAction } from './cutsceneTypes';
import { DialogueId } from '../dialogue/dialogueTypes';
import { getLogger } from '../../../utils/logger';

const logger = getLogger('CutsceneRunner');

export interface CutsceneRunnerCallbacks {
  onComplete?: () => void;
  onDialogueStart?: (dialogueId: DialogueId) => void;
  onMusicChange?: (musicId: string) => void;
  onCameraChange?: (camera: CameraAction) => void;
  onFadeChange?: (alpha: number) => void;
}

/**
 * CutsceneRunner executes in-engine cutscenes using deterministic simulation time.
 * Advances exclusively via update(deltaSeconds).
 * Never uses setTimeout, setInterval, requestAnimationFrame, or independent tickers.
 */
export class CutsceneRunner {
  private definition: CutsceneDefinition | null = null;
  private currentStepIndex = -1;
  private stepElapsedTime = 0;
  private isRunning = false;
  private isPaused = false;
  private completed = false;
  private activeDialogueId: DialogueId | null = null;
  private currentFadeAlpha = 0;
  private currentCamera: CameraAction = { x: 0, y: 0, zoom: 1 };

  private readonly callbacks: CutsceneRunnerCallbacks;

  public constructor(callbacks: CutsceneRunnerCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public start(definition: CutsceneDefinition): void {
    logger.info(`Starting cutscene "${definition.id}" with ${definition.steps.length} steps`);
    this.definition = definition;
    this.currentStepIndex = 0;
    this.stepElapsedTime = 0;
    this.isRunning = true;
    this.isPaused = false;
    this.completed = false;
    this.activeDialogueId = null;
    this.currentFadeAlpha = 0;
    this.currentCamera = { x: 0, y: 0, zoom: 1 };

    this.executeStep(0);
  }

  public update(deltaSeconds: number): void {
    if (!this.isRunning || this.isPaused || this.completed || !this.definition) {
      return;
    }

    if (this.currentStepIndex < 0 || this.currentStepIndex >= this.definition.steps.length) {
      this.finish();
      return;
    }

    const currentStep = this.definition.steps[this.currentStepIndex];

    // If waiting for nested dialogue completion, simulation time does not auto-advance past it
    if (currentStep.type === 'dialogue') {
      return;
    }

    this.stepElapsedTime += deltaSeconds;

    switch (currentStep.type) {
      case 'wait':
        if (this.stepElapsedTime >= currentStep.duration) {
          this.advanceStep();
        }
        break;

      case 'fade': {
        const progress = Math.min(1, Math.max(0, this.stepElapsedTime / currentStep.duration));
        // 'in' fades from black (1) to clear (0); 'out' fades from clear (0) to black (1)
        this.currentFadeAlpha = currentStep.direction === 'in' ? 1 - progress : progress;
        this.callbacks.onFadeChange?.(this.currentFadeAlpha);

        if (this.stepElapsedTime >= currentStep.duration) {
          this.advanceStep();
        }
        break;
      }

      case 'camera': {
        const progress = Math.min(1, Math.max(0, this.stepElapsedTime / currentStep.duration));
        const targetX = currentStep.action.x ?? 0;
        const targetY = currentStep.action.y ?? 0;
        const targetZoom = currentStep.action.zoom ?? 1;

        this.currentCamera = {
          x: targetX * progress,
          y: targetY * progress,
          zoom: 1 + (targetZoom - 1) * progress,
        };
        this.callbacks.onCameraChange?.(this.currentCamera);

        if (this.stepElapsedTime >= currentStep.duration) {
          this.advanceStep();
        }
        break;
      }

      case 'music':
        // Music steps execute immediately
        this.advanceStep();
        break;
    }
  }

  /**
   * Called when embedded dialogue completes to resume cutscene execution.
   */
  public completeDialogue(): void {
    if (!this.isRunning || this.completed || !this.definition) return;
    const currentStep = this.definition.steps[this.currentStepIndex];
    if (currentStep && currentStep.type === 'dialogue') {
      logger.debug(`Embedded dialogue "${currentStep.dialogueId}" completed, resuming cutscene`);
      this.activeDialogueId = null;
      this.advanceStep();
    }
  }

  public skip(): void {
    if (this.completed) return;
    logger.info('Skipping in-engine cutscene');
    this.cleanupTransforms();
    this.finish();
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  public isActive(): boolean {
    return this.isRunning && !this.completed;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public getCurrentStep(): CutsceneStep | null {
    if (!this.definition || this.currentStepIndex < 0 || this.currentStepIndex >= this.definition.steps.length) {
      return null;
    }
    return this.definition.steps[this.currentStepIndex];
  }

  public getActiveDialogueId(): DialogueId | null {
    return this.activeDialogueId;
  }

  public getFadeAlpha(): number {
    return this.currentFadeAlpha;
  }

  public getCamera(): CameraAction {
    return this.currentCamera;
  }

  private advanceStep(): void {
    this.currentStepIndex++;
    this.stepElapsedTime = 0;

    if (!this.definition || this.currentStepIndex >= this.definition.steps.length) {
      this.finish();
      return;
    }

    this.executeStep(this.currentStepIndex);
  }

  private executeStep(index: number): void {
    if (!this.definition) return;
    const step = this.definition.steps[index];
    logger.debug(`Executing cutscene step ${index}: ${step.type}`);

    if (step.type === 'dialogue') {
      this.activeDialogueId = step.dialogueId;
      this.callbacks.onDialogueStart?.(step.dialogueId);
    } else if (step.type === 'music') {
      this.callbacks.onMusicChange?.(step.musicId);
    }
  }

  private cleanupTransforms(): void {
    this.currentFadeAlpha = 0;
    this.currentCamera = { x: 0, y: 0, zoom: 1 };
    this.activeDialogueId = null;
    this.callbacks.onFadeChange?.(0);
    this.callbacks.onCameraChange?.({ x: 0, y: 0, zoom: 1 });
  }

  private finish(): void {
    if (this.completed) return;
    this.completed = true;
    this.isRunning = false;
    this.activeDialogueId = null;
    logger.info('Cutscene finished');
    this.callbacks.onComplete?.();
  }
}
