import { Howl } from 'howler';

const sprite = new Howl({
  src: ['/sounds/bus-sprite.mp3'], // one big file with all sounds
  sprite: {
    // UI
    click: [0, 120],
    buttonPress: [150, 180],
    ready: [350, 400],

    // Countdown & Round
    countdownTick: [500, 80],
    countdownFinal: [600, 450],
    roundStart: [1100, 800],

    // Core Gameplay
    submit: [2000, 300],
    busComplete: [2400, 650],     // iconic bus horn + engine rev
    busStreak: [3150, 420],

    // Power-ups (satisfying!)
    wildcard: [3700, 520],
    banish: [4300, 380],
    freeze: [4800, 300],
    rush: [5200, 280],

    // Results & Feedback
    correct: [5600, 180],         // bright "ding" with light tabla hit
    unique: [5850, 220],          // sparkly + coin
    wrong: [6150, 150],
    appealSuccess: [6400, 350],
    winnerFanfare: [6800, 2800],  // full success + crowd cheer (short)
    bonus: [9800, 650],
  },
  volume: 0.7,
  preload: true,
  html5: false, // true only for very long music
});

// Helper with random pitch variation (feels alive)
const playWithVariation = (spriteName: string, volume = 1, rateRange = [0.95, 1.05]) => {
  const rate = Math.random() * (rateRange[1] - rateRange[0]) + rateRange[0];
  sprite.play(spriteName);
  sprite.rate(rate, sprite.play(spriteName)); // Howler syntax
  sprite.volume(volume);
};

// THEMED PLAY FUNCTIONS (easy to use everywhere)
export const playClick = () => playWithVariation('click', 0.6);
export const playReady = () => playWithVariation('ready', 0.8);
export const playCountdownTick = () => playWithVariation('countdownTick', 0.9, [0.98, 1.02]);
export const playCountdownFinal = () => playWithVariation('countdownFinal', 1);
export const playRoundStart = () => playWithVariation('roundStart', 0.85);
export const playSubmit = () => playWithVariation('submit', 0.9);
export const playBusComplete = () => playWithVariation('busComplete', 1.0, [0.92, 1.08]); // slight horn variation
export const playBusStreak = () => playWithVariation('busStreak', 1);
export const playWildcard = () => playWithVariation('wildcard', 1);
export const playBanish = () => playWithVariation('banish', 0.95);
export const playCorrect = () => playWithVariation('correct', 0.85);
export const playWrong = () => playWithVariation('wrong', 0.85);
export const playUnique = () => playWithVariation('unique', 1);
export const playWinnerFanfare = () => playWithVariation('winnerFanfare', 0.95);
export const playBonus = () => playWithVariation('bonus', 1);

// Master controls (used by SoundProvider)
export const setMasterVolume = (vol: number) => { sprite.volume(vol); };
export const muteAll = () => { sprite.mute(true); };
export const unmuteAll = () => { sprite.mute(false); };
