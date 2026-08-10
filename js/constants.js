/**
 * HUB-UNO — Constantes globales.
 * Colores, composición del mazo, tiempos y rutas de assets.
 */

/** @typedef {'red'|'yellow'|'green'|'blue'} CardColor */
/** @typedef {'number'|'reverse'|'skip'|'draw2'|'wild'|'wild_draw4'} CardType */
/** @typedef {'easy'|'normal'|'hard'} Difficulty */

export const COLORS = /** @type {const} */ (['red', 'yellow', 'green', 'blue']);

export const COLOR_LABELS = {
  red: 'Carmesí',
  yellow: 'Ámbar',
  green: 'Jade',
  blue: 'Cobalto',
};

export const COLOR_HEX = {
  red: '#E63946',
  yellow: '#ffcc00',
  green: '#2A9D8F',
  blue: '#2F6FED',
};

/** Extensión de las imágenes de cartas (cambiar aquí si el usuario entrega .webp/.svg). */
export const CARD_IMAGE_EXT = 'png';

/** Prefijo relativo de imágenes de cartas (GitHub Pages). */
export const CARD_IMAGE_BASE = './assets/cards/';

/** Query de versión para evitar caché del navegador al actualizar arte. */
export const CARD_IMAGE_VERSION = '20260810b';

/**
 * Devuelve la ruta relativa de la imagen de una carta.
 * @param {{ type: string, color?: string|null, value?: number|null }} card
 * @returns {string}
 */
export function cardImageSrc(card) {
  const ext = CARD_IMAGE_EXT;
  const base = CARD_IMAGE_BASE;
  const v = CARD_IMAGE_VERSION;
  let path;
  if (!card) path = `${base}back.${ext}`;
  else {
    switch (card.type) {
      case 'number':
        path = `${base}${card.color}-${card.value}.${ext}`;
        break;
      case 'reverse':
        path = `${base}${card.color}-reverse.${ext}`;
        break;
      case 'skip':
        path = `${base}${card.color}-skip.${ext}`;
        break;
      case 'draw2':
        path = `${base}${card.color}-draw2.${ext}`;
        break;
      case 'wild':
        path = `${base}wild.${ext}`;
        break;
      case 'wild_draw4':
        path = `${base}wild-draw4.${ext}`;
        break;
      default:
        path = `${base}back.${ext}`;
    }
  }
  return `${path}?v=${v}`;
}

/** Ruta del reverso de carta. */
export function cardBackSrc() {
  return `${CARD_IMAGE_BASE}back.${CARD_IMAGE_EXT}?v=${CARD_IMAGE_VERSION}`;
}

/** Composición parametrizada del mazo (108 cartas). */
export const DECK_COMPOSITION = {
  colors: COLORS,
  numbers: {
    zero: 1,
    oneToNine: 2,
  },
  actionsPerColor: {
    reverse: 2,
    skip: 2,
    draw2: 2,
  },
  wilds: {
    wild: 4,
    wild_draw4: 4,
  },
};

export const INITIAL_HAND_SIZE = 7;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 10;

export const BOT_NAMES = [
  'Nova', 'Orbe', 'Zeta', 'Lumen', 'Coral', 'Vega', 'Iris', 'Neón', 'Sable',
];

export const BOT_DELAY_MIN = 500;
export const BOT_DELAY_MAX = 1200;
export const BOT_DELAY_REDUCED = 150;

export const ANIMATION_MS = 250;

export const STORAGE_KEYS = {
  settings: 'hubuno:settings',
  lastConfig: 'hubuno:lastConfig',
  stats: 'hubuno:stats',
  savedGame: 'hubuno:savedGame',
};

export const STORAGE_VERSION = 1;

export const DEFAULT_CONFIG = {
  playerName: 'Tú',
  totalPlayers: 4,
  botNames: ['Nova', 'Orbe', 'Zeta'],
  difficulty: /** @type {Difficulty} */ ('normal'),
  rules: {
    stacking: true,
    playDrawnCard: true,
  },
  sound: false,
  animations: true,
  darkMode: true, // manual GTAHUB: dark-first
  firstPlayer: 'human', // 'human' | 'random'
};

export const TYPE_LABELS = {
  reverse: 'Giro',
  skip: 'Bloqueo',
  draw2: 'Robo',
  wild: 'Comodín',
  wild_draw4: 'Super Robo',
};
