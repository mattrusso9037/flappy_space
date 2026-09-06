import { PlayerToolSystem } from './PlayerToolSystem';
import * as PIXI from 'pixi.js';
import { Subscription } from 'rxjs';
import { GameStateService } from '../gameStateService';
import { Scoreboard } from '../scoreboard';
import { EventBus, GameEvent } from '../eventBus';
import { FlightEffects } from '../visuals/FlightEffects';
import { DEPTH, FONT, INK, MOTION, easeOut } from '../visuals/tokens';
import { GAME_WIDTH, GAME_HEIGHT } from '../config';
import { EntitySystem } from './entitySystem';

/** Pixi HUD and world effects, advanced by GameRuntime. React owns menus/overlays. */
export class UISystem {
  private initialized = false;
  private toolStatus?: PIXI.Text;
  private scoreboard?: Scoreboard;
  private effects?: FlightEffects;
  private hud?: PIXI.Container;
  private banner?: PIXI.Container;
  private bannerPlate?: PIXI.Graphics;
  private bannerTitle?: PIXI.Text;
  private bannerDetail?: PIXI.Text;
  private bannerAge: number = MOTION.warp;
  private thrustElapsed = 0;
  private width = 0;
  private height = 0;
  private subscriptions: Subscription[] = [];

  constructor(private app: PIXI.Application | undefined, private readonly events: EventBus,
    private readonly state: GameStateService, private readonly entities?: EntitySystem, private readonly tools?: PlayerToolSystem) {}

  setPresentationVisible(visible: boolean): void {
    if (this.hud) this.hud.visible = visible;
    if (this.effects) this.effects.container.visible = visible;
  }

  initialize(target: PIXI.Application | PIXI.Container | undefined = this.app, worldCamera?: PIXI.Container): void {
    if (this.initialized) return;
    if (!target) throw new Error('UISystem needs a stage');
    const stage = 'stage' in target ? target.stage : target;
    if ('stage' in target) this.app = target;
    stage.sortableChildren = true;
    this.hud = new PIXI.Container({ label: 'hud', zIndex: DEPTH.hud, eventMode: 'none' });
    this.toolStatus = new PIXI.Text({ text: '', style: { fontFamily: FONT.telemetry, fontSize: 11, fill: INK.ice } });
    this.hud.addChild(this.toolStatus);
    this.scoreboard = new Scoreboard();
    this.hud.addChild(this.scoreboard.getContainer());
    this.effects = new FlightEffects();
    this.effects.container.zIndex = DEPTH.effects;
    (worldCamera ?? stage).addChild(this.effects.container);
    stage.addChild(this.hud);
    this.banner = new PIXI.Container({ visible: false });
    this.bannerPlate = new PIXI.Graphics();
    this.banner.addChild(this.bannerPlate);
    this.bannerTitle = new PIXI.Text({ text: '', style: { fontFamily: FONT.display, fontWeight: '700', fontSize: 32, fill: INK.ice } });
    this.bannerDetail = new PIXI.Text({ text: 'ENERGY LOCKED  /  ENGAGING WARP', style: { fontFamily: FONT.telemetry, fontSize: 10, fill: INK.cyan } });
    this.bannerTitle.anchor.set(0.5);
    this.bannerDetail.anchor.set(0.5); this.bannerDetail.y = 34;
    this.banner.addChild(this.bannerTitle, this.bannerDetail);
    this.hud.addChild(this.banner);
    this.initialized = true;
    this.subscriptions.push(this.state.getState$().subscribe(s => {
      this.scoreboard?.setStatus(s.isLevelComplete ? 'ENERGY LOCKED' : s.isGameOver ? 'SIGNAL LOST' : s.isStarted ? 'MISSION / LIVE' : 'FLIGHT READY');
      this.scoreboard?.update(s.score, s.level, s.orbsCollected, s.orbsRequired, s.timeRemaining);
    }));
    this.subscriptions.push(this.events.on(GameEvent.ORB_COLLECTED).subscribe(data => {
      this.effects?.burst(data.x, data.y, 'collection');
    }));
    this.subscriptions.push(this.events.on(GameEvent.GAME_OVER).subscribe(() => {
      const pilot = this.entities?.getAstronaut();
      if (pilot) this.effects?.burst(pilot.sprite.x, pilot.sprite.y, 'impact');
    }));
    this.subscriptions.push(this.events.on(GameEvent.LEVEL_COMPLETE).subscribe(({ level }) => {
      this.bannerAge = 0;
      if (this.bannerTitle) this.bannerTitle.text = `SECTOR ${String(level).padStart(2, '0')} CLEARED`;
      if (this.bannerDetail) this.bannerDetail.text = this.state.getState().isGameOver
        ? 'ALL SECTORS COMPLETE' : 'ENERGY LOCKED  /  ENGAGING WARP';
      const center = this.effects?.container.toLocal({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 }, stage);
      if (center) this.effects?.burst(center.x, center.y, 'warp');
    }));
    this.update(0);
  }

  update(seconds = 0): void {
    if (!this.initialized) return;
    const screen = this.app?.renderer?.screen;
    const width = screen?.width ?? GAME_WIDTH, height = screen?.height ?? GAME_HEIGHT;
    if (this.hud && this.app) {
      const scale = this.app.stage.scale.x || 1;
      this.hud.scale.set(1 / scale);
      this.hud.position.set(-this.app.stage.x / scale, -this.app.stage.y / scale);
    }
    if (width !== this.width || height !== this.height) {
      this.width = width; this.height = height;
      this.scoreboard?.layout(width, height);
      if (this.banner) this.banner.position.set(width / 2, height / 2);
      if (this.bannerTitle) this.bannerTitle.style.fontSize = width < 620 ? 24 : 36;
      const plateWidth = Math.min(width - 24, 480);
      this.bannerPlate?.clear().roundRect(-plateWidth / 2, -52, plateWidth, 110, 4)
        .fill({ color: INK.hull, alpha: 0.92 }).stroke({ color: INK.cyan, alpha: 0.5, width: 1 })
        .moveTo(-plateWidth / 2, -36).lineTo(-plateWidth / 2, -52).lineTo(-plateWidth / 2 + 24, -52)
        .stroke({ color: INK.cyan, width: 2 });
    }
    if (this.toolStatus) {
      this.toolStatus.visible = !!this.tools?.getConfig();
      this.toolStatus.position.set(16, height - 128);
      const equipped = this.tools?.getEquipped() ? 'WALL BUILDER' : 'NO TOOL';
      const result = this.tools?.getLastResult();
      this.toolStatus.text = `${equipped}  ${this.entities?.getWalls().length ?? 0}/${this.tools?.getConfig()?.wallBuilder.maxActive ?? 0}  ${result ?? ''}\n1 Equip / 0 Unequip / E Build / X Remove latest`;
    }
    this.effects?.update(seconds);
    const pilot = this.entities?.getAstronaut();
    const state = this.state.getState();
    if (pilot && !pilot.dead && state.isStarted && !state.isLevelComplete && pilot.thrustRemaining > 0) {
      this.thrustElapsed += seconds;
      if (this.thrustElapsed >= 1 / 45) {
        this.effects?.thrust(pilot.sprite.x - 12, pilot.sprite.y + 13);
        this.thrustElapsed %= 1 / 45;
      }
    } else this.thrustElapsed = 0;
    if (this.banner) {
      this.bannerAge = Math.min(MOTION.warp, this.bannerAge + seconds);
      this.banner.visible = this.bannerAge < MOTION.warp;
      this.banner.alpha = Math.min(easeOut(this.bannerAge / 0.18), (MOTION.warp - this.bannerAge) / 0.3);
      this.banner.scale.set(0.96 + easeOut(this.bannerAge / 0.3) * 0.04);
    }
  }

  reset(): void {
    this.setPresentationVisible(true);
    this.effects?.reset();
    this.bannerAge = MOTION.warp;
    this.thrustElapsed = 0;
    if (this.banner) this.banner.visible = false;
  }

  dispose(): void {
    if (!this.initialized) return;
    this.subscriptions.forEach(sub => sub.unsubscribe()); this.subscriptions = [];
    this.effects?.dispose();
    this.hud?.destroy({ children: true });
    this.initialized = false;
  }
}
