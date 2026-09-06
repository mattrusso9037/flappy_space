import { Container, Graphics, GraphicsContext, Text } from 'pixi.js';
import { FONT, INK, MOTION, easeOut } from './tokens';
import { ORB_POINTS } from '../config';

interface Spark { node: Graphics; age: number; life: number; vx: number; vy: number }
interface Burst { root: Container; ring: Graphics; text?: Text; age: number; life: number }

/** Small bounded effects, driven ONLY by the owning runtime's simulation delta. */
export class FlightEffects {
  readonly container = new Container({ label: 'flight-effects', eventMode: 'none' });
  private readonly dot = new GraphicsContext().circle(0, 0, 2).fill(INK.ice);
  private readonly sparks: Spark[] = [];
  private readonly bursts: Burst[] = [];
  private disposed = false;
  static readonly capacity = 96;

  constructor() {
    // A fixed pool is justified by continuous thrust emission. Geometry is shared.
    for (let i = 0; i < FlightEffects.capacity; i++) {
      const node = new Graphics(this.dot);
      node.visible = false;
      this.container.addChild(node);
      this.sparks.push({ node, age: 0, life: 0, vx: 0, vy: 0 });
    }
  }

  private spark(x: number, y: number, vx: number, vy: number, color: number, life: number): void {
    const spark = this.sparks.find(item => !item.node.visible);
    if (!spark || this.disposed) return;
    spark.node.position.set(x, y);
    spark.node.tint = color;
    spark.node.alpha = 1;
    spark.node.scale.set(1);
    spark.node.visible = true;
    spark.age = 0;
    spark.life = life;
    spark.vx = vx;
    spark.vy = vy;
  }

  thrust(x: number, y: number): void {
    this.spark(x, y, -65 - Math.random() * 35, 35 + Math.random() * 35, INK.cyan, MOTION.thrust);
  }

  burst(x: number, y: number, kind: 'collection' | 'impact' | 'warp'): void {
    if (this.disposed || this.bursts.length >= 6) return;
    const color = kind === 'impact' ? INK.hazard : INK.cyan;
    const root = new Container({ x, y });
    const ring = new Graphics().circle(0, 0, 12).stroke({ color, width: 1.5 });
    root.addChild(ring);
    const text = kind === 'collection' ? new Text({ text: `+${ORB_POINTS}`, style: {
      fontFamily: FONT.telemetry, fontSize: 15, fill: INK.ice,
    } }) : undefined;
    if (text) { text.anchor.set(0.5); text.y = -24; root.addChild(text); }
    this.container.addChild(root);
    const life = kind === 'impact' ? MOTION.impact : MOTION.collection;
    this.bursts.push({ root, ring, text, age: 0, life });
    const count = kind === 'warp' ? 24 : 12;
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count;
      const speed = kind === 'warp' ? 220 : 75;
      this.spark(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed,
        kind === 'collection' && i % 2 ? INK.violet : color, life);
    }
  }

  update(seconds: number): void {
    if (this.disposed || seconds <= 0) return;
    for (const spark of this.sparks) {
      if (!spark.node.visible) continue;
      spark.age += seconds;
      const t = Math.min(1, spark.age / spark.life);
      spark.node.position.set(spark.node.x + spark.vx * seconds, spark.node.y + spark.vy * seconds);
      spark.node.alpha = (1 - t) * (1 - t);
      spark.node.scale.set(1 - t * 0.7);
      if (t === 1) spark.node.visible = false;
    }
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const burst = this.bursts[i];
      burst.age += seconds;
      const t = Math.min(1, burst.age / burst.life);
      burst.ring.scale.set(1 + easeOut(t) * 3);
      burst.ring.alpha = 1 - t;
      if (burst.text) { burst.text.y = -24 - easeOut(t) * 24; burst.text.alpha = 1 - t; }
      if (t === 1) { burst.root.destroy({ children: true }); this.bursts.splice(i, 1); }
    }
  }

  get activeCount(): number { return this.sparks.filter(spark => spark.node.visible).length + this.bursts.length; }

  reset(): void {
    if (this.disposed) return;
    for (const spark of this.sparks) { spark.node.visible = false; spark.age = 0; }
    for (const burst of this.bursts) burst.root.destroy({ children: true });
    this.bursts.length = 0;
  }

  dispose(): void {
    if (this.disposed) return;
    this.reset();
    this.container.destroy({ children: true });
    this.dot.destroy();
    this.disposed = true;
  }
}
