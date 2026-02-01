class SoundManager {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    this.preload();
  }

  private preload() {
    const soundFiles = {
      countdown: '/sounds/timer.mp3',
      countdownFinal: '/sounds/whistle.mp3',
      roundStart: '/sounds/start.mp3',
      bus: '/sounds/bus_horn.mp3',
      freeze: '/sounds/ice.mp3',
      wildcard: '/sounds/magic.mp3',
      banish: '/sounds/banish.mp3',
      submit: '/sounds/submit.mp3',
      click: '/sounds/click.mp3',
      rush: '/sounds/alarm.mp3',
      bonus: '/sounds/coin.mp3',
      win: '/sounds/win.mp3',
      notification: '/sounds/notification.mp3',
      vote: '/sounds/click.mp3'
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
