/**
 * HUB-UNO — RuleEngine: validación y efectos (funciones puras).
 */

import { equalsMatch } from './card.js';

/**
 * Vista mínima del estado para validación.
 * @typedef {Object} RuleState
 * @property {import('./card.js').Card} topCard
 * @property {string} activeColor
 * @property {number} pendingDraw
 * @property {'draw2'|'wild_draw4'|null} pendingDrawType
 * @property {{ stacking?: boolean }} [rules]
 */

/**
 * ¿La carta es jugable en el estado actual?
 * @param {import('./card.js').Card} card
 * @param {RuleState} state
 * @returns {boolean}
 */
export function isPlayable(card, state) {
  if (!card || !state?.topCard) return false;

  const stacking = state.rules?.stacking !== false;

  if (state.pendingDraw > 0) {
    if (!stacking) return false;
    if (state.pendingDrawType === 'draw2') return card.type === 'draw2';
    if (state.pendingDrawType === 'wild_draw4') return card.type === 'wild_draw4';
    return false;
  }

  return equalsMatch(card, state.topCard, state.activeColor);
}

/**
 * Cartas jugables de una mano.
 * @param {import('./card.js').Card[]} hand
 * @param {RuleState} state
 * @returns {import('./card.js').Card[]}
 */
export function getPlayableCards(hand, state) {
  return (hand || []).filter((c) => isPlayable(c, state));
}

/**
 * Resultado de aplicar el efecto de una carta.
 * @typedef {Object} EffectResult
 * @property {number} direction - Nueva dirección (1 o -1)
 * @property {number} skipCount - Jugadores a saltar además del avance normal
 * @property {number} pendingDraw - Nueva penalización acumulada
 * @property {'draw2'|'wild_draw4'|null} pendingDrawType
 * @property {boolean} needsColorChoice
 * @property {string|null} activeColor - Si no necesita elección, color resultante (null = sin cambio)
 */

/**
 * Resuelve el efecto de una carta jugada (puro).
 * @param {import('./card.js').Card} card
 * @param {{ direction: number, pendingDraw: number, pendingDrawType: string|null, playerCount: number, stacking?: boolean }} ctx
 * @returns {EffectResult}
 */
export function resolveCardEffect(card, ctx) {
  const direction = ctx.direction;
  const stacking = ctx.stacking !== false;

  /** @type {EffectResult} */
  const result = {
    direction,
    skipCount: 0,
    pendingDraw: ctx.pendingDraw,
    pendingDrawType: ctx.pendingDrawType,
    needsColorChoice: false,
    activeColor: card.color || null,
  };

  switch (card.type) {
    case 'reverse':
      if (ctx.playerCount === 2) {
        // En 2 jugadores, Giro actúa como Bloqueo
        result.skipCount = 1;
      } else {
        result.direction = /** @type {1|-1} */ (-direction);
      }
      break;
    case 'skip':
      result.skipCount = 1;
      break;
    case 'draw2': {
      const add = 2;
      if (stacking && ctx.pendingDraw > 0 && ctx.pendingDrawType === 'draw2') {
        result.pendingDraw = ctx.pendingDraw + add;
      } else {
        result.pendingDraw = add;
      }
      result.pendingDrawType = 'draw2';
      // El salto por robo se aplica cuando el objetivo NO puede/apila; el controlador
      // gestiona pendingDraw. Aquí marcamos skip cuando no hay apilado pendiente
      // para el siguiente (el controlador decide).
      break;
    }
    case 'wild':
      result.needsColorChoice = true;
      result.activeColor = null;
      break;
    case 'wild_draw4': {
      result.needsColorChoice = true;
      result.activeColor = null;
      const add = 4;
      if (stacking && ctx.pendingDraw > 0 && ctx.pendingDrawType === 'wild_draw4') {
        result.pendingDraw = ctx.pendingDraw + add;
      } else {
        result.pendingDraw = add;
      }
      result.pendingDrawType = 'wild_draw4';
      break;
    }
    case 'number':
    default:
      break;
  }

  return result;
}

/**
 * Cantidad de cartas que añade una carta de robo.
 * @param {import('./card.js').Card} card
 * @returns {number}
 */
export function drawAmountForCard(card) {
  if (card.type === 'draw2') return 2;
  if (card.type === 'wild_draw4') return 4;
  return 0;
}

/**
 * ¿Puede apilar esta carta sobre la penalización pendiente?
 * @param {import('./card.js').Card} card
 * @param {RuleState} state
 * @returns {boolean}
 */
export function canStack(card, state) {
  if (!state.pendingDraw || state.rules?.stacking === false) return false;
  return isPlayable(card, state);
}
