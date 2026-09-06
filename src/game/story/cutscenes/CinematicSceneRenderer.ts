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
        if (scene.backdrop === 'surface') {
          // Alien surface environment backdrop: sky, distant mountains, and solid ground crust
          const backdropG = new Graphics()
            .rect(0, 0, 800, 600)
            .fill(INK.void);

          // Ambient alien stars in the upper sky
          for (let i = 0; i < 35; i++) {
            backdropG.circle((i * 197.51) % 800, (i * 83.73) % 430, i % 5 === 0 ? 1.4 : 0.8)
              .fill({ color: INK.cyan, alpha: 0.15 + (i % 4) * 0.08 });
          }

          // Distant alien mountain silhouettes in twilight purple
          backdropG.moveTo(0, 480)
            .lineTo(120, 410).lineTo(220, 460).lineTo(380, 390)
            .lineTo(510, 470).lineTo(660, 420).lineTo(800, 490)
            .lineTo(800, 600).lineTo(0, 600)
            .fill({ color: 0x120c2b, alpha: 0.85 });

          backdropG.moveTo(0, 500)
            .lineTo(180, 450).lineTo(320, 510).lineTo(480, 460)
            .lineTo(620, 500).lineTo(740, 460).lineTo(800, 510)
            .lineTo(800, 600).lineTo(0, 600)
            .fill({ color: 0x1d1442, alpha: 0.9 });

          // Solid ground crust floor across bottom (y: 520 to 600)
          backdropG.rect(0, 520, 800, 80).fill(0x191a32);
          // Glowing alien crust surface line
          backdropG.moveTo(0, 520).lineTo(800, 520)
            .stroke({ color: INK.cyan, width: 3, alpha: 0.9 });
          backdropG.moveTo(0, 524).lineTo(800, 524)
            .stroke({ color: INK.violet, width: 2, alpha: 0.4 });

          this.container.addChild(backdropG);
        } else if (scene.backdrop !== 'none') {
          // Default: open space sky with stars (backward compatible)
          const sky = new Graphics().rect(0, 0, 800, 600).fill(INK.void);
          for (let i = 0; i < 100; i++) {
            sky.circle((i * 137.51) % 800, (i * 93.73) % 600, i % 7 === 0 ? 1.5 : 0.7)
              .fill({ color: INK.ice, alpha: 0.2 + (i % 5) * 0.12 });
          }
          this.container.addChild(sky);
        }

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
      case 'matter-gun': {
        // Holographic ground aura/glow under the matter gun on the floor
        const aura = new Graphics()
          .ellipse(0, 8, 28, 6)
          .fill({ color: INK.cyan, alpha: 0.35 });
        root.addChild(aura);

        // Gun chassis
        const gun = new Graphics();
        // Main receiver body (dark metallic hull)
        gun.roundRect(-18, -6, 36, 12, 3)
          .fill({ color: INK.hull })
          .stroke({ color: INK.cyan, width: 1.5, alpha: 0.8 });

        // Grip / handle
        gun.moveTo(-10, 6).lineTo(-14, 14).lineTo(-8, 14).lineTo(-5, 6)
          .fill({ color: INK.hull })
          .stroke({ color: 0x223344, width: 1 });

        // Glowing matter-synthesizer energy emitter core
        gun.roundRect(-8, -4, 16, 8, 2)
          .fill({ color: INK.cyan, alpha: 0.85 });

        // Barrel nozzle
        gun.rect(18, -4, 8, 8)
          .fill({ color: 0x3a4860 })
          .stroke({ color: INK.cyan, width: 1, alpha: 0.6 });

        // Muzzle focus ring
        gun.rect(26, -5, 3, 10)
          .fill({ color: INK.ice });

        // Emissive light pulse dot
        gun.circle(28, 0, 2)
          .fill({ color: INK.cyan });

        root.addChild(gun);
        break;
      }
    }
    return root;
  }
}
