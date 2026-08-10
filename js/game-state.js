/**
 * HUB-UNO — GameState: modelo y helpers de estado (datos, sin reglas).
 */

import { DEFAULT_CONFIG } from './constants.js';
import { createDeck, shuffle, drawCards, drawStartingCard, createRng } from './deck.js';
import { createPlayers } from './players.js';
import { INITIAL_HAND_SIZE } from './constants.js';

/**
 * @typedef {Object} GameState
 * @property {'setup'|'playing'|'finished'} status
 * @property {object} config
 * @property {import('./players.js').Player[]} players
 * @property {import('./card.js').Card[]} drawPile
 * @property {import('./card.js').Card[]} discardPile
 * @property {import('./card.js').Card|null} topCard
 * @property {string|null} activeColor
 * @property {1|-1} direction
 * @property {number} currentPlayerIndex
 * @property {number} pendingDraw
 * @property {'draw2'|'wild_draw4'|null} pendingDrawType
 * @property {object[]} history
 * @property {string|null} winner
 * @property {object} stats
 * @property {boolean} inputLocked
 * @property {import('./card.js').Card|null} drawnCardOffer
 * @property {number|null} seed
 */

/**
 * Crea un estado inicial en setup.
 * @param {Partial<typeof DEFAULT_CONFIG>} [config]
 * @returns {GameState}
 */
export function createEmptyState(config = {}) {
  const merged = { ...DEFAULT_CONFIG, ...config, rules: { ...DEFAULT_CONFIG.rules, ...(config.rules || {}) } };
  return {
    status: 'setup',
    config: merged,
    players: [],
    drawPile: [],
    discardPile: [],
    topCard: null,
    activeColor: null,
    direction: 1,
    currentPlayerIndex: 0,
    pendingDraw: 0,
    pendingDrawType: null,
    history: [],
    winner: null,
    stats: {
      turnsPlayed: 0,
      cardsDrawn: {},
      startedAt: null,
    },
    inputLocked: false,
    drawnCardOffer: null,
    seed: null,
  };
}

/**
 * Inicializa una partida completa (mazo, reparto, carta inicial).
 * @param {Partial<typeof DEFAULT_CONFIG>} config
 * @param {{ seed?: number }} [opts]
 * @returns {GameState}
 */
export function createGame(config = {}, opts = {}) {
  const state = createEmptyState(config);
  const seed = opts.seed ?? null;
  const rng = seed != null ? createRng(seed) : Math.random;
  state.seed = seed;

  state.players = createPlayers(state.config);
  let deck = shuffle(createDeck(), rng);

  // Reparto
  for (let round = 0; round < INITIAL_HAND_SIZE; round++) {
    for (const player of state.players) {
      const { drawn, drawPile } = drawCards(deck, [], 1, rng);
      deck = drawPile;
      if (drawn[0]) player.hand.push(drawn[0]);
    }
  }

  const start = drawStartingCard(deck, rng);
  state.drawPile = start.drawPile;
  state.topCard = start.topCard;
  state.discardPile = [start.topCard];
  state.activeColor = start.topCard.color;
  state.direction = 1;
  state.pendingDraw = 0;
  state.pendingDrawType = null;
  state.status = 'playing';
  state.winner = null;
  state.drawnCardOffer = null;
  state.inputLocked = false;

  // Primer jugador
  if (state.config.firstPlayer === 'random') {
    state.currentPlayerIndex = Math.floor(rng() * state.players.length);
  } else {
    state.currentPlayerIndex = 0; // humano
  }

  state.stats = {
    turnsPlayed: 0,
    cardsDrawn: Object.fromEntries(state.players.map((p) => [p.id, 0])),
    startedAt: Date.now(),
  };

  pushHistory(state, null, 'deal', 'Se repartieron 7 cartas a cada jugador.');
  pushHistory(state, null, 'start', `Carta inicial: ${start.topCard.label}.`);

  return state;
}

/**
 * Añade una entrada al historial (mutando, máx. ~40).
 * @param {GameState} state
 * @param {string|null} actorId
 * @param {string} action
 * @param {string} text
 */
export function pushHistory(state, actorId, action, text) {
  state.history.push({
    turn: state.stats.turnsPlayed,
    actorId,
    action,
    text,
  });
  if (state.history.length > 40) state.history.shift();
}

/**
 * Vista pública anti-trampas para bots.
 * @param {GameState} state
 * @param {number} botIndex
 * @returns {object}
 */
export function buildPublicView(state, botIndex) {
  const me = state.players[botIndex];
  const dir = state.direction;
  const count = state.players.length;
  const nextIdx = (botIndex + dir + count * 10) % count;

  return {
    myHand: me.hand.map((c) => ({ ...c })),
    topCard: state.topCard ? { ...state.topCard } : null,
    activeColor: state.activeColor,
    direction: state.direction,
    pendingDraw: state.pendingDraw,
    pendingDrawType: state.pendingDrawType,
    rules: { ...state.config.rules },
    opponents: state.players
      .map((p, i) => ({
        id: p.id,
        isHuman: p.isHuman,
        cardCount: p.hand.length,
        isNext: i === nextIdx,
        index: i,
      }))
      .filter((o) => o.id !== me.id),
    discardTopHistory: state.discardPile.slice(-8).map((c) => ({ ...c })),
  };
}

/**
 * Clona superficialmente el estado para lecturas (no deep-clone de manos).
 * @param {GameState} state
 * @returns {GameState}
 */
export function cloneStateLite(state) {
  return {
    ...state,
    config: { ...state.config, rules: { ...state.config.rules } },
    players: state.players.map((p) => ({ ...p, hand: p.hand.slice() })),
    drawPile: state.drawPile.slice(),
    discardPile: state.discardPile.slice(),
    history: state.history.slice(),
    stats: {
      ...state.stats,
      cardsDrawn: { ...state.stats.cardsDrawn },
    },
  };
}
