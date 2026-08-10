/**
 * HUB-UNO — Definición y helpers de carta.
 */

import { COLOR_LABELS, TYPE_LABELS, cardImageSrc } from './constants.js';

/**
 * @typedef {Object} Card
 * @property {string} id
 * @property {'number'|'reverse'|'skip'|'draw2'|'wild'|'wild_draw4'} type
 * @property {'red'|'yellow'|'green'|'blue'|null} color
 * @property {number|null} value
 * @property {string|null} symbol
 * @property {string} label
 */

/**
 * Crea una carta con etiqueta accesible.
 * @param {Omit<Card, 'label'> & { label?: string }} data
 * @returns {Card}
 */
export function createCard(data) {
  const label = data.label || buildCardLabel(data);
  return {
    id: data.id,
    type: data.type,
    color: data.color ?? null,
    value: data.value ?? null,
    symbol: data.symbol ?? null,
    label,
  };
}

/**
 * @param {{ type: string, color?: string|null, value?: number|null }} card
 * @returns {string}
 */
export function buildCardLabel(card) {
  if (card.type === 'wild') return 'Comodín';
  if (card.type === 'wild_draw4') return 'Super Robo, roba 4';
  const colorName = card.color ? COLOR_LABELS[card.color] : '';
  if (card.type === 'number') return `${colorName} ${card.value}`;
  return `${colorName} ${TYPE_LABELS[card.type] || card.type}`;
}

/**
 * Etiqueta ARIA enriquecida (incluye estado jugable).
 * @param {Card} card
 * @param {{ playable?: boolean }} [opts]
 * @returns {string}
 */
export function cardAriaLabel(card, opts = {}) {
  let label = card.label;
  if (card.type === 'reverse') label += ': cambia el sentido';
  else if (card.type === 'skip') label += ': salta al siguiente';
  else if (card.type === 'draw2') label += ': el siguiente roba 2';
  else if (card.type === 'wild') label += ': cambia el color';
  else if (card.type === 'wild_draw4') label += ': cambia color y el siguiente roba 4';
  if (opts.playable) label += ', jugable';
  return label;
}

/**
 * ¿Coincide por color, valor o símbolo (sin comodines)?
 * @param {Card} card
 * @param {Card} top
 * @param {string} activeColor
 * @returns {boolean}
 */
export function equalsMatch(card, top, activeColor) {
  if (!card || !top) return false;
  if (card.type === 'wild' || card.type === 'wild_draw4') return true;
  if (card.color && card.color === activeColor) return true;
  if (card.type === 'number' && top.type === 'number' && card.value === top.value) return true;
  if (
    card.type !== 'number' &&
    card.type === top.type &&
    (card.type === 'reverse' || card.type === 'skip' || card.type === 'draw2')
  ) {
    return true;
  }
  return false;
}

/**
 * Orden de comparación para ordenar la mano (color, tipo, valor).
 * @param {Card} a
 * @param {Card} b
 * @returns {number}
 */
export function compareCards(a, b) {
  const colorOrder = { red: 0, yellow: 1, green: 2, blue: 3, null: 4 };
  const typeOrder = { number: 0, reverse: 1, skip: 2, draw2: 3, wild: 4, wild_draw4: 5 };
  const ca = colorOrder[a.color ?? 'null'] ?? 9;
  const cb = colorOrder[b.color ?? 'null'] ?? 9;
  if (ca !== cb) return ca - cb;
  const ta = typeOrder[a.type] ?? 9;
  const tb = typeOrder[b.type] ?? 9;
  if (ta !== tb) return ta - tb;
  return (a.value ?? 0) - (b.value ?? 0);
}

export { cardImageSrc };
