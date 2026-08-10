/**
 * HUB-UNO — Creación, barajado, robo y reposición del mazo.
 */

import { DECK_COMPOSITION } from './constants.js';
import { createCard } from './card.js';

/**
 * Generador PRNG mulberry32 (reproducible con semilla).
 * @param {number} seed
 * @returns {() => number}
 */
export function createRng(seed) {
  let t = seed >>> 0;
  return function rng() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Crea las 108 cartas según DECK_COMPOSITION.
 * @returns {import('./card.js').Card[]}
 */
export function createDeck() {
  /** @type {import('./card.js').Card[]} */
  const cards = [];
  const { colors, numbers, actionsPerColor, wilds } = DECK_COMPOSITION;

  for (const color of colors) {
    cards.push(
      createCard({
        id: `${color}-0-a`,
        type: 'number',
        color,
        value: 0,
        symbol: null,
      }),
    );

    for (let n = 1; n <= 9; n++) {
      for (let copy = 0; copy < numbers.oneToNine; copy++) {
        const suffix = copy === 0 ? 'a' : 'b';
        cards.push(
          createCard({
            id: `${color}-${n}-${suffix}`,
            type: 'number',
            color,
            value: n,
            symbol: null,
          }),
        );
      }
    }

    const actions = [
      ['reverse', 'reverse'],
      ['skip', 'skip'],
      ['draw2', '+2'],
    ];
    for (const [type, symbol] of actions) {
      const count = actionsPerColor[type];
      for (let copy = 0; copy < count; copy++) {
        const suffix = copy === 0 ? 'a' : 'b';
        cards.push(
          createCard({
            id: `${color}-${type}-${suffix}`,
            type,
            color,
            value: null,
            symbol,
          }),
        );
      }
    }
  }

  for (let i = 0; i < wilds.wild; i++) {
    cards.push(
      createCard({
        id: `wild-${i}`,
        type: 'wild',
        color: null,
        value: null,
        symbol: 'wild',
      }),
    );
  }
  for (let i = 0; i < wilds.wild_draw4; i++) {
    cards.push(
      createCard({
        id: `wild_draw4-${i}`,
        type: 'wild_draw4',
        color: null,
        value: null,
        symbol: '+4',
      }),
    );
  }

  return cards;
}

/**
 * Baraja in-place con Fisher–Yates.
 * @param {import('./card.js').Card[]} deck
 * @param {() => number} [rng]
 * @returns {import('./card.js').Card[]}
 */
export function shuffle(deck, rng = Math.random) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/**
 * Roba n cartas del mazo; repone desde descarte si hace falta.
 * @param {import('./card.js').Card[]} drawPile
 * @param {import('./card.js').Card[]} discardPile
 * @param {number} n
 * @param {() => number} [rng]
 * @returns {{ drawn: import('./card.js').Card[], drawPile: import('./card.js').Card[], discardPile: import('./card.js').Card[], shortfall: number }}
 */
export function drawCards(drawPile, discardPile, n, rng = Math.random) {
  let pile = drawPile.slice();
  let discard = discardPile.slice();
  /** @type {import('./card.js').Card[]} */
  const drawn = [];
  let shortfall = 0;

  for (let i = 0; i < n; i++) {
    if (pile.length === 0) {
      const result = refillFromDiscard(pile, discard, rng);
      pile = result.drawPile;
      discard = result.discardPile;
    }
    if (pile.length === 0) {
      shortfall = n - i;
      break;
    }
    drawn.push(pile.pop());
  }

  return { drawn, drawPile: pile, discardPile: discard, shortfall };
}

/**
 * Rebaraja la pila de descarte dejando solo la carta superior.
 * @param {import('./card.js').Card[]} drawPile
 * @param {import('./card.js').Card[]} discardPile
 * @param {() => number} [rng]
 */
export function refillFromDiscard(drawPile, discardPile, rng = Math.random) {
  if (discardPile.length <= 1) {
    return { drawPile: drawPile.slice(), discardPile: discardPile.slice() };
  }
  const top = discardPile[discardPile.length - 1];
  const rest = discardPile.slice(0, -1);
  const newDraw = shuffle(rest, rng);
  return { drawPile: newDraw, discardPile: [top] };
}

/**
 * Voltea la primera carta numérica para iniciar la pila de descarte.
 * Las acciones/comodines se reinsertan y se baraja de nuevo.
 * @param {import('./card.js').Card[]} drawPile
 * @param {() => number} [rng]
 * @returns {{ topCard: import('./card.js').Card, drawPile: import('./card.js').Card[] }}
 */
export function drawStartingCard(drawPile, rng = Math.random) {
  let pile = drawPile.slice();
  /** @type {import('./card.js').Card[]} */
  const rejected = [];
  let top = null;

  while (pile.length > 0) {
    const card = pile.pop();
    if (card.type === 'number') {
      top = card;
      break;
    }
    rejected.push(card);
  }

  if (rejected.length) {
    pile = shuffle(pile.concat(rejected), rng);
  }

  if (!top) {
    // Caso extremo: no hay numéricas (no debería ocurrir con mazo estándar)
    top = pile.pop();
  }

  return { topCard: top, drawPile: pile };
}
