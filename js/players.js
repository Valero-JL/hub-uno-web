/**
 * HUB-UNO — Creación de jugadores humanos y bots.
 */

import { BOT_NAMES } from './constants.js';

/**
 * @typedef {Object} Player
 * @property {string} id
 * @property {string} name
 * @property {boolean} isHuman
 * @property {'easy'|'normal'|'hard'|null} difficulty
 * @property {import('./card.js').Card[]} hand
 */

/**
 * Crea la lista de jugadores (1 humano + N-1 bots).
 * @param {{ playerName: string, totalPlayers: number, botNames?: string[], difficulty: string }} config
 * @returns {Player[]}
 */
export function createPlayers(config) {
  const total = Math.max(2, Math.min(10, config.totalPlayers || 4));
  const botCount = total - 1;
  const names = (config.botNames && config.botNames.length)
    ? config.botNames
    : BOT_NAMES.slice(0, botCount);

  /** @type {Player[]} */
  const players = [
    {
      id: 'p0',
      name: (config.playerName || 'Tú').slice(0, 16),
      isHuman: true,
      difficulty: null,
      hand: [],
    },
  ];

  for (let i = 0; i < botCount; i++) {
    players.push({
      id: `p${i + 1}`,
      name: (names[i] || BOT_NAMES[i % BOT_NAMES.length] || `Bot ${i + 1}`).slice(0, 16),
      isHuman: false,
      difficulty: /** @type {'easy'|'normal'|'hard'} */ (config.difficulty || 'normal'),
      hand: [],
    });
  }

  return players;
}

/**
 * Genera nombres de bots por defecto para N bots.
 * @param {number} botCount
 * @returns {string[]}
 */
export function defaultBotNames(botCount) {
  const names = [];
  for (let i = 0; i < botCount; i++) {
    names.push(BOT_NAMES[i % BOT_NAMES.length] + (i >= BOT_NAMES.length ? ` ${Math.floor(i / BOT_NAMES.length) + 1}` : ''));
  }
  return names;
}
