/**
 * HUB-UNO — StorageManager: localStorage con validación y try/catch.
 */

import { STORAGE_KEYS, STORAGE_VERSION } from './constants.js';

/**
 * Lee JSON de localStorage.
 * @param {string} key
 * @returns {any|null}
 */
export function readStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.v !== STORAGE_VERSION) {
      console.warn('Storage version mismatch or corrupt, discarding', key);
      return null;
    }
    return data.payload;
  } catch (err) {
    console.warn('localStorage read failed', err);
    return null;
  }
}

/**
 * Escribe JSON en localStorage.
 * @param {string} key
 * @param {any} payload
 * @returns {boolean}
 */
export function writeStorage(key, payload) {
  try {
    localStorage.setItem(key, JSON.stringify({ v: STORAGE_VERSION, payload }));
    return true;
  } catch (err) {
    console.warn('localStorage write failed', err);
    return false;
  }
}

/** @returns {object|null} */
export function loadSettings() {
  return readStorage(STORAGE_KEYS.settings);
}

/** @param {object} settings */
export function saveSettings(settings) {
  return writeStorage(STORAGE_KEYS.settings, settings);
}

/** @returns {object|null} */
export function loadLastConfig() {
  return readStorage(STORAGE_KEYS.lastConfig);
}

/** @param {object} config */
export function saveLastConfig(config) {
  return writeStorage(STORAGE_KEYS.lastConfig, config);
}

/**
 * Gancho post-MVP para partida guardada (no activo en MVP).
 * @returns {null}
 */
export function loadSavedGame() {
  // MVP: no continuar partida
  return null;
}

/** @param {object} _state */
export function saveGame(_state) {
  // MVP: no-op (gancho preparado)
  return false;
}

export function clearSavedGame() {
  try {
    localStorage.removeItem(STORAGE_KEYS.savedGame);
  } catch {
    /* ignore */
  }
}
