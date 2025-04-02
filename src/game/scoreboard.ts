import * as PIXI from 'pixi.js';
import { GAME_WIDTH } from './config';

export class Scoreboard {
  private container!: PIXI.Container;
  private scoreText!: PIXI.Text;
  private levelText!: PIXI.Text;
  private orbsText!: PIXI.Text;
  private timeText!: PIXI.Text;
  private progressBar!: PIXI.Graphics;
  private progressFill!: PIXI.Graphics;
  private style!: PIXI.TextStyle;

  constructor() {
    try {
      console.log('Scoreboard: Constructor started');
      this.container = new PIXI.Container();
      this.container.x = 10;
      this.container.y = 10;
      console.log('Scoreboard: Container created', this.container);

      // Create text style
      this.style = new PIXI.TextStyle({
        fontFamily: 'Arial',
        fontSize: 16,
        fill: '#0ff',
        align: 'left',
        stroke: {
          color: '#000',
          width: 4
        }
      });
      console.log('Scoreboard: Style created');

      // Create score text
      this.scoreText = new PIXI.Text('Score: 0', this.style);
      this.scoreText.y = 0;
      this.container.addChild(this.scoreText);
      console.log('Scoreboard: Score text added');

      // Create level text
      this.levelText = new PIXI.Text('Level: 1', this.style);
      this.levelText.y = 20;
      this.container.addChild(this.levelText);
      console.log('Scoreboard: Level text added');

      // Create orbs text
      this.orbsText = new PIXI.Text('Orbs: 0/0', this.style);
      this.orbsText.y = 40;
      this.container.addChild(this.orbsText);
      console.log('Scoreboard: Orbs text added');

      // Create time text
      this.timeText = new PIXI.Text('Time: 0:0', this.style);
      this.timeText.y = 60;
      this.container.addChild(this.timeText);
      console.log('Scoreboard: Time text added');

      // Create progress bar background
      this.progressBar = new PIXI.Graphics();
      this.progressBar.beginFill(0x333333);
      this.progressBar.drawRect(0, 85, 200, 10);
      this.progressBar.endFill();
      this.container.addChild(this.progressBar);
      console.log('Scoreboard: Progress bar added');

      // Create progress bar fill
      this.progressFill = new PIXI.Graphics();
      this.progressFill.beginFill(0x66AAFF);
      this.progressFill.drawRect(0, 85, 0, 10);
      this.progressFill.endFill();
      this.container.addChild(this.progressFill);
      console.log('Scoreboard: Progress fill added');
      
      console.log('Scoreboard: UI elements created successfully');
    } catch (error) {
      console.error('Scoreboard: Error during construction', error);
    }
  }

  update(score: number, level: number, orbsCollected: number, orbsRequired: number, timeRemaining: number) {
    // Update score
    this.scoreText.text = `Score: ${score}`;

    // Update level
    this.levelText.text = `Level: ${level}`;

    // Update orbs
    this.orbsText.text = `Orbs: ${orbsCollected}/${orbsRequired}`;

    // Update time with better formatting
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    const ms = Math.floor((timeRemaining % 1000) / 100); // Get tenths of a second
    
    // Format time as M:SS.T for better readability
    let timeDisplay = `Time: ${minutes}:${seconds.toString().padStart(2, '0')}.${ms}`;
    this.timeText.text = timeDisplay;

    // Update progress bar
    const progress = Math.min(100, (orbsCollected / orbsRequired) * 100);
    this.progressFill.clear();
    
    // Use color to indicate progress - from blue to green as progress increases
    let progressColor = 0x66AAFF;
    if (progress >= 75) {
      progressColor = 0x00FF88; // Light green at 75%+
    } else if (progress >= 50) {
      progressColor = 0x88FF00; // Yellow-green at 50%+
    } else if (progress >= 25) {
      progressColor = 0xFFCC00; // Orange at 25%+
    }
    
    if (progress >= 100) {
      progressColor = 0x00FF00; // Bright green when complete
    }
    
    this.progressFill.beginFill(progressColor);
    this.progressFill.drawRect(0, 85, progress * 2, 10);
    this.progressFill.endFill();

    // Update time color based on remaining time
    if (timeRemaining <= 5000) {
      // Critical time - flashing red
      this.timeText.style.fill = '#FF0000';
      
      // Add pulsing effect for critical time
      const pulseScale = 1 + 0.1 * Math.sin(Date.now() * 0.01);
      this.timeText.scale.set(pulseScale);
    } else if (timeRemaining <= 10000) {
      // Warning time - red
      this.timeText.style.fill = '#FF0000';
      this.timeText.scale.set(1); // Reset scale
    } else if (timeRemaining <= 30000) {
      // Caution time - orange
      this.timeText.style.fill = '#FFAA00';
      this.timeText.scale.set(1); // Reset scale
    } else {
      // Normal time - cyan
      this.timeText.style.fill = '#00FFFF';
      this.timeText.scale.set(1); // Reset scale
    }
  }

  getContainer(): PIXI.Container {
    console.log('Scoreboard: getContainer called', this.container);
    if (!this.container) {
      console.error('Scoreboard: Container is undefined!');
      // Return an empty container rather than undefined
      return new PIXI.Container();
    }
    return this.container;
  }
} 