class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    this.preload();
  }

  private preload() {
    const soundFiles = {
      countdown: 'https://assets.mixkit.co/active_storage/sfx/2567/2567-preview.mp3', // Subtle tick
      countdownFinal: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // Pop
      roundStart: 'https://assets.mixkit.co/active_storage/sfx/2581/2581-preview.mp3', // Level up
      bus: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3', // Achievement
      freeze: 'https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3',
      wildcard: 'https://assets.mixkit.co/active_storage/sfx/2580/2580-preview.mp3',
      banish: 'https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3',
      submit: 'https://assets.mixkit.co/active_storage/sfx/2567/2567-preview.mp3',
      click: 'https://assets.mixkit.co/active_storage/sfx/2567/2567-preview.mp3',
      rush: 'https://assets.mixkit.co/active_storage/sfx/2574/2574-preview.mp3',
      bonus: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
      win: 'https://assets.mixkit.co/active_storage/sfx/2580/2580-preview.mp3',
      notification: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3', // More pleasant notification
      vote: 'https://assets.mixkit.co/active_storage/sfx/2567/2567-preview.mp3',
      error: 'https://assets.mixkit.co/active_storage/sfx/2574/2574-preview.mp3' // Clear but not annoying error
    };

    Object.entries(soundFiles).forEach(([key, src]) => {
      const audio = new Audio(src);
      audio.volume = this.volume;
      this.sounds.set(key, audio);
    });
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
