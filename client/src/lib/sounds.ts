class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = false; // Disabled by default as per user request
  private volume: number = 0;

  constructor() {
    // No preloading, effectively disabling all sounds
  }

  private preload() {
    // Empty per user request to remove all sounds
  }

  public play(sound: string) {
    if (!this.enabled) return;
    const audio = this.sounds.get(sound);
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch(e => {
        // Ignore auto-play errors
      });
    }
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach(audio => audio.volume = this.volume);
  }
}

export const soundManager = new SoundManager();

// Export individual functions expected by Game.tsx and others
export const playCountdownSound = () => soundManager.play('countdown');
export const playCountdownFinalSound = () => soundManager.play('countdownFinal');
export const playRoundStart = () => soundManager.play('roundStart');
export const playBusSound = () => soundManager.play('bus');
export const playFreezeSound = () => soundManager.play('freeze');
export const playWildcardSound = () => soundManager.play('wildcard');
export const playBanishSound = () => soundManager.play('banish');
export const playSubmitSound = () => soundManager.play('submit');
export const playClickSound = () => soundManager.play('click');
export const playRushActivateSound = () => soundManager.play('rush');
export const playBonusSound = () => soundManager.play('bonus');
export const playWinSound = () => soundManager.play('win');
export const playNotificationSound = () => soundManager.play('notification');

// Added for completeness
export const playVoteSound = () => soundManager.play('vote');
export const playReactionSound = () => soundManager.play('notification');
export const playSuccessSound = () => soundManager.play('win');
export const playTimerWarning = () => soundManager.play('countdown');
export const playTimerUrgent = () => soundManager.play('rush');
export const playErrorSound = () => soundManager.play('rush');
export const playTypeSound = () => soundManager.play('vote');
export const resumeAudioContext = () => { };
export const setMasterVolume = (v: number) => soundManager.setVolume(v);
export const muteAll = () => soundManager.setEnabled(false);
export const unmuteAll = () => soundManager.setEnabled(true);
