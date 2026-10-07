// Sound Engine (Touch and UI Sound Effects Disabled)
class SoundEngine {
  constructor() {
    this.audioCtx = null;
    this.enabled = false;
  }

  init() {
    // Disabled
  }

  toggle() {
    this.enabled = false;
    return false;
  }

  playBeep() {
    // Disabled
  }

  playLaserScan() {
    // Disabled
  }

  playLockOn() {
    // Disabled
  }

  playAlert() {
    // Disabled
  }
}

export const sounds = new SoundEngine();
