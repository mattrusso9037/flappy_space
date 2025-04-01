import * as PIXI from 'pixi.js';
import { GAME_WIDTH } from './config';

export class Scoreboard {
  private container: PIXI.Container;
  private scoreText: PIXI.Text;
  private levelText: PIXI.Text;
  private orbsText: PIXI.Text;
  private timeText: PIXI.Text;
  private progressBar: PIXI.Graphics;
  private progressFill: PIXI.Graphics;
  private style: PIXI.TextStyle;

  constructor() {
    this.container = new PIXI.Container();
    this.container.x = 10;
    this.container.y = 10;

    // Create text style
    this.style = new PIXI.TextStyle({
      fontFamily: 'Press Start 2P',
      fontSize: 12,
      fill: '#0ff',
      align: 'left',
      stroke: '#000',
      strokeThickness: 4
    });

    // Create score text
    this.scoreText = new PIXI.Text('Score: 0', this.style);
    this.scoreText.y = 0;
    this.container.addChild(this.scoreText);

    // Create level text
    this.levelText = new PIXI.Text('Level: 1', this.style);
    this.levelText.y = 20;
    this.container.addChild(this.levelText);

    // Create orbs text
    this.orbsText = new PIXI.Text('Orbs: 0/0', this.style);
    this.orbsText.y = 40;
    this.container.addChild(this.orbsText);

    // Create time text
    this.timeText = new PIXI.Text('Time: 0:00', this.style);
    this.timeText.y = 60;
    this.container.addChild(this.timeText);

    // Create progress bar background
    this.progressBar = new PIXI.Graphics();
    this.progressBar.beginFill(0x333333);
    this.progressBar.drawRect(0, 85, 200, 10);
    this.progressBar.endFill();
    this.container.addChild(this.progressBar);

    // Create progress bar fill
    this.progressFill = new PIXI.Graphics();
    this.progressFill.beginFill(0x66AAFF);
    this.progressFill.drawRect(0, 85, 0, 10);
    this.progressFill.endFill();
    this.container.addChild(this.progressFill);
  }

  update(score: number, level: number, orbsCollected: number, orbsRequired: number, timeRemaining: number) {
    // Update score
    this.scoreText.text = `Score: ${score}`;

    // Update level
    this.levelText.text = `Level: ${level}`;

    // Update orbs
    this.orbsText.text = `Orbs: ${orbsCollected}/${orbsRequired}`;

    // Update time
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    this.timeText.text = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Update progress bar
    const progress = Math.min(100, (orbsCollected / orbsRequired) * 100);
    this.progressFill.clear();
    this.progressFill.beginFill(progress >= 100 ? 0x00FF00 : 0x66AAFF);
    this.progressFill.drawRect(0, 85, progress * 2, 10);
    this.progressFill.endFill();

    // Update time color based on remaining time
    if (timeRemaining <= 10000) {
      this.timeText.style.fill = '#FF0000';
    } else if (timeRemaining <= 30000) {
      this.timeText.style.fill = '#FFAA00';
    } else {
      this.timeText.style.fill = '#00FF00';
    }
  }

  getContainer(): PIXI.Container {
    return this.container;
  }
} 