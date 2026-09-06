import { AnimatedSprite, Container, Graphics, Sprite } from 'pixi.js';
import assetManager from '../../assetManager';
import { INK } from '../../visuals/tokens';
import { ASTRONAUT_SPRITE_DEFINITION, createAnimatedSprite, resolveSpritePresentation } from '../../visuals/spriteAnimations';
import { CinematicScene, SceneActorKind, sampleActor } from './sceneTypes';

/** A disposable world-space presentation layer. Never touches gameplay entities. */
export class CinematicSceneRenderer {
  readonly container = new Container({ label: 'cinematic-scene', zIndex: 15, eventMode: 'none' });
  private scene: CinematicScene | null = null;
  private actors: Container[] = [];

  render(scene: CinematicScene | null, time: number): void {
    if (scene !== this.scene) {
      this.clear();
      this.scene = scene;
      if (scene) {
        const sky = new Graphics().rect(0, 0, 800, 600).fill(INK.void);
        for (let i = 0; i < 100; i++) {
          sky.circle((i * 137.51) % 800, (i * 93.73) % 600, i % 7 === 0 ? 1.5 : 0.7)
            .fill({ color: INK.ice, alpha: 0.2 + (i % 5) * 0.12 });
        }
        this.container.addChild(sky);
        this.actors = scene.actors.map(actor => {
          const visual = this.createActor(actor.kind);
          visual.label = actor.id;
          this.container.addChild(visual);
          return visual;
        });
      }
    }
    scene?.actors.forEach((actor, index) => {
      const pose = sampleActor(actor, time);
      const visual = this.actors[index];
      visual.position.set(pose.x, pose.y);
      visual.scale.set(pose.scale);
      visual.rotation = pose.rotation;
      visual.alpha = pose.alpha;
      for (const child of visual.children) {
        if (child instanceof AnimatedSprite) {
          const fps = ASTRONAUT_SPRITE_DEFINITION.animations.idle.fps;
          child.gotoAndStop(Math.floor(Math.max(0, time) * fps) % child.totalFrames);
        }
      }
    });
  }

  clear(): void {
    this.container.removeChildren().forEach(child => child.destroy({ children: true }));
    this.actors = [];
    this.scene = null;
  }

  dispose(): void {
    this.clear();
    this.container.destroy();
  }

  private createActor(kind: SceneActorKind): Container {
    const root = new Container();
    const g = new Graphics();
    root.addChild(g);
    switch (kind) {
      case 'pilot': {
        const presentation = resolveSpritePresentation(assetManager, ASTRONAUT_SPRITE_DEFINITION);
        const pilot = createAnimatedSprite(presentation, 'idle');
        root.addChild(pilot);
        break;
      }
      case 'ship': {
        const sprite = new Sprite(assetManager.getTexture('spaceship-broken'));
        sprite.anchor.set(0.5);
        sprite.width = 380;
        sprite.height = 253;
        root.addChild(sprite);
        break;
      }
      case 'wormhole': {
        const sprite = new Sprite(assetManager.getTexture('wormhole'));
        sprite.anchor.set(0.5);
        sprite.width = 280;
        sprite.height = 264;
        root.addChild(sprite);
        break;
      }
      case 'repair-sparks':
        for (let i = 0; i < 9; i++) {
          const angle = i * 2.4;
          g.moveTo(Math.cos(angle) * 4, Math.sin(angle) * 4)
            .lineTo(Math.cos(angle) * (10 + i), Math.sin(angle) * (10 + i))
            .stroke({ color: i % 2 ? INK.amber : INK.ice, width: 2 });
        }
        g.circle(0, 0, 3).fill(INK.ice);
        break;
      case 'tether':
        g.moveTo(0, 0).bezierCurveTo(-35, 70, 60, 100, 75, 55)
          .stroke({ color: INK.muted, width: 2, alpha: 0.8 });
        break;
    }
    return root;
  }
}
