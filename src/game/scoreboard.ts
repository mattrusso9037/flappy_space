import { Container, Graphics, Text } from 'pixi.js';
import { FONT, INK } from './visuals/tokens';

/** Viewport-space telemetry. Values are updated only when their displayed string changes. */
export class Scoreboard {
  private readonly container = new Container({ label: 'telemetry', eventMode: 'none' });
  private readonly frame = new Graphics();
  private readonly segments = new Graphics();
  private readonly scoreText = this.text('0', 36, INK.ice);
  private readonly levelText = this.text('Level: 1', 16, INK.cyan);
  private readonly orbsText = this.text('Orbs: 0/5', 16, INK.ice);
  private readonly timeText = this.text('1:00.0', 24, INK.ice);
  private readonly scoreLabel = this.text('FLIGHT SCORE', 9, INK.muted);
  private readonly levelLabel = this.text('MISSION / LIVE', 9, INK.muted);
  private readonly orbLabel = this.text('ENERGY RECOVERED', 9, INK.violet);
  private readonly timerLabel = this.text('TIME REMAINING', 9, INK.muted);
  private readonly hint = this.text('SPACE / TAP  ·  THRUST', 10, INK.muted);
  private width = 800;
  private height = 600;
  private progress = -1;

  constructor() {
    this.container.addChild(this.frame, this.segments, this.scoreLabel, this.levelLabel, this.orbLabel,
      this.timerLabel, this.scoreText, this.levelText, this.orbsText, this.timeText, this.hint);
    this.scoreText.label = 'score'; this.levelText.label = 'level';
    this.orbsText.label = 'orbs'; this.timeText.label = 'time';
    this.scoreText.style.fontFamily = FONT.display; this.scoreText.style.fontWeight = '700';
    this.layout(800, 600);
  }

  private text(value: string, size: number, color: number): Text {
    return new Text({ text: value, style: { fontFamily: FONT.telemetry, fontSize: size, fill: color } });
  }

  layout(width: number, height: number): void {
    this.width = width; this.height = height;
    const compact = width < 620;
    const edge = compact ? 12 : 22;
    const scoreX = compact ? edge : width / 2 - 104;
    const timerX = compact ? width - 155 : width - 214;
    this.frame.clear();
    const panel = (x: number, y: number, w: number, h: number) => {
      this.frame.roundRect(x, y, w, h, 5).fill({ color: INK.hull, alpha: 0.8 })
        .stroke({ color: INK.cyan, alpha: 0.24, width: 1 });
      this.frame.moveTo(x, y + 10).lineTo(x, y).lineTo(x + 16, y).stroke({ color: INK.cyan, width: 1 });
    };
    panel(scoreX, edge, compact ? 154 : 208, compact ? 65 : 80);
    panel(timerX, edge, compact ? 143 : 192, compact ? 65 : 70);
    if (!compact) panel(edge, edge, 150, 62);
    panel(edge, height - edge - 70, compact ? 170 : 215, 70);
    this.scoreLabel.position.set(scoreX + 12, edge + 10);
    this.scoreText.position.set(scoreX + 12, edge + 25);
    this.scoreText.style.fontSize = compact ? 26 : 36;
    this.levelLabel.visible = !compact;
    this.levelLabel.position.set(edge + 12, edge + 10);
    this.levelText.position.set(compact ? edge + 12 : edge + 12, compact ? edge + 78 : edge + 28);
    this.levelText.style.fontSize = compact ? 12 : 16;
    this.timeText.style.fontSize = compact ? 19 : 24;
    this.timerLabel.position.set(timerX + 12, edge + 10);
    this.timeText.position.set(timerX + 12, edge + 28);
    this.orbLabel.position.set(edge + 12, height - edge - 59);
    this.orbsText.position.set(edge + 12, height - edge - 42);
    this.hint.position.set(compact ? width - 136 : width - 225, height - edge - 20);
    this.hint.text = compact ? 'TAP TO THRUST' : 'SPACE / TAP  ·  THRUST';
    const previous = this.progress; this.progress = -1; this.drawProgress(previous < 0 ? 0 : previous);
  }

  private drawProgress(progress: number): void {
    if (progress === this.progress) return;
    this.progress = progress;
    const compact = this.width < 620;
    const edge = compact ? 12 : 22;
    const segmentWidth = compact ? 12.5 : 17;
    this.segments.clear();
    for (let i = 0; i < 10; i++) {
      this.segments.rect(edge + 12 + i * (segmentWidth + 2), this.height - edge - 17, segmentWidth, 5)
        .fill({ color: i < progress * 10 ? INK.cyan : INK.muted, alpha: i < progress * 10 ? 0.9 : 0.15 });
    }
  }

  update(score: number, level: number, collected: number, required: number, remaining: number): void {
    const set = (text: Text, value: string) => { if (text.text !== value) text.text = value; };
    set(this.scoreText, score.toLocaleString('en-US'));
    set(this.levelText, `Level: ${level}`);
    set(this.orbsText, `Orbs: ${collected}/${required}`);
    const tenths = Math.max(0, Math.floor(remaining / 100));
    set(this.timeText, `${Math.floor(tenths / 600)}:${Math.floor(tenths / 10 % 60).toString().padStart(2, '0')}.${tenths % 10}`);
    const color = remaining <= 10000 ? INK.hazard : remaining <= 30000 ? INK.amber : INK.cyan;
    if (this.timeText.style.fill !== color) this.timeText.style.fill = color;
    this.drawProgress(required > 0 ? Math.min(1, Math.max(0, collected / required)) : 0);
  }

  setStatus(status: string): void {
    if (this.levelLabel.text !== status) this.levelLabel.text = status;
  }

  getContainer(): Container { return this.container; }
  dispose(): void { this.container.destroy({ children: true }); }
}
