import { getLogger } from './logger';

const logger = getLogger('FrameRateMonitor');

/**
 * Utility class to monitor frame rate and performance metrics
 */
export class FrameRateMonitor {
  private static instance: FrameRateMonitor;
  
  private frameCount: number = 0;
  private lastTime: number = 0;
  private fps: number = 0;
  private fpsHistory: number[] = [];
  private deltaMSHistory: number[] = []; // Track deltaMS values
  private enabled: boolean = false;
  private logInterval: number = 1000; // Log every 1 second
  private maxHistorySize: number = 10; // Keep last 10 readings
  private restartCount: number = 0; // Count how many times the game has restarted
  
  private tickerSpeedHistory: Array<{restart: number, time: number, speed: number}> = [];
  
  private constructor() {
    // Private constructor for singleton
  }
  
  public static getInstance(): FrameRateMonitor {
    if (!FrameRateMonitor.instance) {
      FrameRateMonitor.instance = new FrameRateMonitor();
    }
    return FrameRateMonitor.instance;
  }
  
  /**
   * Start monitoring frame rate
   */
  public enable(): void {
    this.enabled = true;
    this.lastTime = performance.now();
    this.frameCount = 0;
    this.fpsHistory = [];
    logger.info('Frame rate monitoring enabled');
  }
  
  /**
   * Stop monitoring frame rate
   */
  public disable(): void {
    this.enabled = false;
    logger.info('Frame rate monitoring disabled');
  }
  
  /**
   * Set how often to log frame rate
   */
  public setLogInterval(ms: number): void {
    this.logInterval = ms;
    logger.info(`Log interval set to ${ms}ms`);
  }
  
  /**
   * Record a game restart event
   */
  public recordRestart(tickerSpeed: number): void {
    this.restartCount++;
    const time = performance.now();
    
    // Record ticker speed at restart
    this.tickerSpeedHistory.push({
      restart: this.restartCount,
      time,
      speed: tickerSpeed
    });
    
    // Keep history manageable
    if (this.tickerSpeedHistory.length > this.maxHistorySize * 2) {
      this.tickerSpeedHistory = this.tickerSpeedHistory.slice(-this.maxHistorySize);
    }
    
    logger.info(`Game restart #${this.restartCount} recorded at ${time}ms, ticker speed: ${tickerSpeed}`);
    
    // Log ticker speed history
    if (this.tickerSpeedHistory.length > 1) {
      logger.info('Ticker speed history:');
      this.tickerSpeedHistory.forEach(entry => {
        logger.info(`Restart #${entry.restart}: ${entry.speed.toFixed(4)} at ${Math.round(entry.time)}ms`);
      });
    }
  }
  
  /**
   * Track a frame and its deltaMS
   */
  public trackFrame(deltaMS: number): void {
    if (!this.enabled) return;
    
    this.frameCount++;
    this.deltaMSHistory.push(deltaMS);
    
    // Keep history manageable
    if (this.deltaMSHistory.length > 100) {
      this.deltaMSHistory = this.deltaMSHistory.slice(-100);
    }
    
    const now = performance.now();
    const elapsed = now - this.lastTime;
    
    // Calculate and log FPS regularly
    if (elapsed >= this.logInterval) {
      this.fps = (this.frameCount / elapsed) * 1000;
      this.fpsHistory.push(this.fps);
      
      // Keep history manageable
      if (this.fpsHistory.length > this.maxHistorySize) {
        this.fpsHistory.shift();
      }
      
      // Calculate average deltaMS
      const avgDeltaMS = this.deltaMSHistory.reduce((sum, val) => sum + val, 0) / this.deltaMSHistory.length;
      const minDeltaMS = Math.min(...this.deltaMSHistory);
      const maxDeltaMS = Math.max(...this.deltaMSHistory);
      
      // Log FPS and deltaMS stats
      logger.info(`FPS: ${this.fps.toFixed(1)} | ` +
                 `deltaMS avg: ${avgDeltaMS.toFixed(2)}ms, ` +
                 `min: ${minDeltaMS.toFixed(2)}ms, ` +
                 `max: ${maxDeltaMS.toFixed(2)}ms | ` +
                 `Restart count: ${this.restartCount}`);
      
      // Log FPS trend if we have history
      if (this.fpsHistory.length > 1) {
        const trend = this.fpsHistory.map(fps => fps.toFixed(1)).join(' → ');
        logger.info(`FPS trend: ${trend}`);
        
        // Alert if FPS is consistently decreasing
        this.detectPerformanceIssues();
      }
      
      // Reset for next interval
      this.lastTime = now;
      this.frameCount = 0;
      this.deltaMSHistory = [];
    }
  }
  
  /**
   * Detect potential performance issues
   */
  private detectPerformanceIssues(): void {
    if (this.fpsHistory.length < 3) return;
    
    // Check if FPS has been consistently decreasing
    let isDecreasing = true;
    for (let i = 1; i < this.fpsHistory.length; i++) {
      if (this.fpsHistory[i] >= this.fpsHistory[i-1]) {
        isDecreasing = false;
        break;
      }
    }
    
    if (isDecreasing) {
      logger.warn('PERFORMANCE ALERT: FPS has been consistently decreasing!');
      
      // Calculate percentage drop
      const firstFPS = this.fpsHistory[0];
      const lastFPS = this.fpsHistory[this.fpsHistory.length - 1];
      const percentDrop = ((firstFPS - lastFPS) / firstFPS) * 100;
      
      logger.warn(`FPS dropped by ${percentDrop.toFixed(1)}% from ${firstFPS.toFixed(1)} to ${lastFPS.toFixed(1)}`);
      
      // Compare with ticker speed history
      if (this.tickerSpeedHistory.length > 1) {
        const firstSpeed = this.tickerSpeedHistory[0].speed;
        const lastSpeed = this.tickerSpeedHistory[this.tickerSpeedHistory.length - 1].speed;
        logger.warn(`Ticker speed changed from ${firstSpeed.toFixed(4)} to ${lastSpeed.toFixed(4)}`);
      }
    }
  }
  
  /**
   * Get current FPS
   */
  public getFPS(): number {
    return this.fps;
  }
  
  /**
   * Get FPS history
   */
  public getFPSHistory(): number[] {
    return [...this.fpsHistory];
  }
  
  /**
   * Get ticker speed history
   */
  public getTickerSpeedHistory(): Array<{restart: number, time: number, speed: number}> {
    return [...this.tickerSpeedHistory];
  }
}

// Export a default instance for convenient imports
export const frameRateMonitor = FrameRateMonitor.getInstance(); 