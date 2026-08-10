/**
 * HUB-UNO — AudioManager: sonidos opcionales, tolerante a fallos.
 */

const SOUND_MAP = {
  play: './assets/sounds/play.mp3',
  draw: './assets/sounds/draw.mp3',
  turn: './assets/sounds/turn.mp3',
  win: './assets/sounds/win.mp3',
  error: './assets/sounds/error.mp3',
};

/**
 * @returns {{ setEnabled: (v: boolean) => void, play: (name: string) => void }}
 */
export function createAudioManager() {
  let enabled = false;
  /** @type {Record<string, HTMLAudioElement|null>} */
  const cache = {};

  function setEnabled(v) {
    enabled = !!v;
  }

  /**
   * @param {keyof typeof SOUND_MAP | string} name
   */
  function play(name) {
    if (!enabled) return;
    const src = SOUND_MAP[name];
    if (!src) return;
    try {
      let audio = cache[name];
      if (!audio) {
        audio = new Audio(src);
        audio.preload = 'auto';
        cache[name] = audio;
        audio.addEventListener('error', () => {
          console.warn('Audio missing or failed:', src);
          cache[name] = null;
        });
      }
      if (!audio) return;
      audio.currentTime = 0;
      const p = audio.play();
      if (p && typeof p.catch === 'function') {
        p.catch((err) => {
          console.warn('Audio play blocked', err);
        });
      }
    } catch (err) {
      console.warn('Audio error', err);
    }
  }

  return { setEnabled, play };
}
