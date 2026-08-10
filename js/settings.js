/**
 * HUB-UNO — SettingsManager: preferencias y tema.
 */

import { DEFAULT_CONFIG } from './constants.js';
import { loadSettings, saveSettings, loadLastConfig, saveLastConfig } from './storage.js';

/**
 * @typedef {Object} AppSettings
 * @property {string} playerName
 * @property {number} totalPlayers
 * @property {string[]} botNames
 * @property {'easy'|'normal'|'hard'} difficulty
 * @property {{ stacking: boolean, playDrawnCard: boolean }} rules
 * @property {boolean} sound
 * @property {boolean} animations
 * @property {boolean|null} darkMode
 */

/**
 * Carga preferencias mezcladas con defaults.
 * @returns {AppSettings}
 */
export function loadAppSettings() {
  const stored = loadSettings() || {};
  const last = loadLastConfig() || {};
  return {
    playerName: stored.playerName || last.playerName || DEFAULT_CONFIG.playerName,
    totalPlayers: last.totalPlayers || DEFAULT_CONFIG.totalPlayers,
    botNames: last.botNames || DEFAULT_CONFIG.botNames.slice(),
    difficulty: last.difficulty || DEFAULT_CONFIG.difficulty,
    rules: {
      stacking: last.rules?.stacking ?? DEFAULT_CONFIG.rules.stacking,
      playDrawnCard: last.rules?.playDrawnCard ?? DEFAULT_CONFIG.rules.playDrawnCard,
    },
    sound: stored.sound ?? DEFAULT_CONFIG.sound,
    animations: stored.animations ?? DEFAULT_CONFIG.animations,
    darkMode: stored.darkMode ?? DEFAULT_CONFIG.darkMode,
  };
}

/**
 * Persiste preferencias y última config.
 * @param {AppSettings} settings
 */
export function persistAppSettings(settings) {
  saveSettings({
    playerName: settings.playerName,
    sound: settings.sound,
    animations: settings.animations,
    darkMode: settings.darkMode,
  });
  saveLastConfig({
    playerName: settings.playerName,
    totalPlayers: settings.totalPlayers,
    botNames: settings.botNames,
    difficulty: settings.difficulty,
    rules: settings.rules,
  });
}

/**
 * Aplica tema claro/oscuro al documento.
 * @param {boolean|null} darkMode - null = sistema
 */
export function applyTheme(darkMode) {
  const root = document.documentElement;
  let dark = darkMode;
  if (dark === null || dark === undefined) {
    dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  root.dataset.theme = dark ? 'dark' : 'light';
  root.classList.toggle('theme-dark', !!dark);
}

/**
 * ¿Reducir movimiento?
 * @param {boolean} animationsPref
 * @returns {boolean}
 */
export function shouldAnimate(animationsPref) {
  if (!animationsPref) return false;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return false;
  }
  return true;
}
