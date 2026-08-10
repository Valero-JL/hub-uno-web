/**
 * Runner ligero (sin dependencias) para funciones puras de HUB-UNO.
 * Uso: node tests/unit/run-tests.mjs
 */

import { createDeck, shuffle, createRng, drawStartingCard, drawCards, refillFromDiscard } from '../../js/deck.js';
import { isPlayable, getPlayableCards, resolveCardEffect } from '../../js/rules.js';
import { nextPlayerIndex } from '../../js/turns.js';
import { createGame, buildPublicView } from '../../js/game-state.js';
import { decideBotAction } from '../../js/bots.js';
import { createCard } from '../../js/card.js';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log('  ✓', msg);
  } else {
    failed++;
    console.error('  ✗', msg);
  }
}

console.log('Deck');
{
  const deck = createDeck();
  assert(deck.length === 108, 'mazo tiene 108 cartas');
  const nums = deck.filter((c) => c.type === 'number');
  assert(nums.length === 76, '76 numéricas');
  const wilds = deck.filter((c) => c.type === 'wild' || c.type === 'wild_draw4');
  assert(wilds.length === 8, '8 comodines');
  const rng = createRng(42);
  const a = shuffle(createDeck(), rng).map((c) => c.id).join(',');
  const b = shuffle(createDeck(), createRng(42)).map((c) => c.id).join(',');
  assert(a === b, 'barajado reproducible con semilla');
  const start = drawStartingCard(shuffle(createDeck(), createRng(7)), createRng(7));
  assert(start.topCard.type === 'number', 'carta inicial siempre numérica');
}

console.log('Rules');
{
  const top = createCard({ id: 'g5', type: 'number', color: 'green', value: 5, symbol: null });
  const state = { topCard: top, activeColor: 'green', pendingDraw: 0, pendingDrawType: null, rules: { stacking: true } };
  assert(isPlayable(createCard({ id: 'r5', type: 'number', color: 'red', value: 5, symbol: null }), state), 'match por número');
  assert(isPlayable(createCard({ id: 'g9', type: 'number', color: 'green', value: 9, symbol: null }), state), 'match por color');
  assert(!isPlayable(createCard({ id: 'r9', type: 'number', color: 'red', value: 9, symbol: null }), state), 'no match');
  assert(isPlayable(createCard({ id: 'w', type: 'wild', color: null, value: null, symbol: 'wild' }), state), 'comodín siempre');
  const skipG = createCard({ id: 'gs', type: 'skip', color: 'green', value: null, symbol: 'skip' });
  const skipR = createCard({ id: 'rs', type: 'skip', color: 'red', value: null, symbol: 'skip' });
  assert(isPlayable(skipR, { ...state, topCard: skipG, activeColor: 'blue' }), 'match por símbolo');

  const stackState = { ...state, pendingDraw: 2, pendingDrawType: 'draw2' };
  assert(isPlayable(createCard({ id: 'd2', type: 'draw2', color: 'red', value: null, symbol: '+2' }), stackState), 'apilar +2');
  assert(!isPlayable(createCard({ id: 'wd4', type: 'wild_draw4', color: null, value: null, symbol: '+4' }), stackState), 'no mezclar +4 sobre +2');

  const rev = resolveCardEffect(
    createCard({ id: 'rv', type: 'reverse', color: 'red', value: null, symbol: 'reverse' }),
    { direction: 1, pendingDraw: 0, pendingDrawType: null, playerCount: 4 },
  );
  assert(rev.direction === -1, 'Giro invierte sentido');
  const rev2 = resolveCardEffect(
    createCard({ id: 'rv2', type: 'reverse', color: 'red', value: null, symbol: 'reverse' }),
    { direction: 1, pendingDraw: 0, pendingDrawType: null, playerCount: 2 },
  );
  assert(rev2.skipCount === 1, 'Giro en 2p actúa como Bloqueo');
}

console.log('Turns');
{
  assert(nextPlayerIndex(0, 4, 1, 0) === 1, 'siguiente horario');
  assert(nextPlayerIndex(0, 4, -1, 0) === 3, 'siguiente antihorario');
  assert(nextPlayerIndex(0, 4, 1, 1) === 2, 'bloqueo salta uno');
}

console.log('Game + bots anti-cheat');
{
  const game = createGame({ playerName: 'Tú', totalPlayers: 3, difficulty: 'normal', botNames: ['A', 'B'] }, { seed: 99 });
  assert(game.players.every((p) => p.hand.length === 7), 'reparto 7');
  assert(game.topCard.type === 'number', 'inicio numérico');
  const view = buildPublicView(game, 1);
  assert(view.myHand.length === 7, 'bot ve su mano');
  assert(view.opponents.every((o) => o.cardCount !== undefined && !('hand' in o)), 'vista pública sin manos ajenas');
  const decision = decideBotAction(view, 'normal');
  assert(['play', 'draw', 'drawPenalty'].includes(decision.action), 'bot decide acción válida');
}

console.log('Refill');
{
  const top = createCard({ id: 't', type: 'number', color: 'blue', value: 1, symbol: null });
  const discard = [
    createCard({ id: 'a', type: 'number', color: 'red', value: 2, symbol: null }),
    createCard({ id: 'b', type: 'number', color: 'green', value: 3, symbol: null }),
    top,
  ];
  const refilled = refillFromDiscard([], discard, createRng(1));
  assert(refilled.discardPile.length === 1 && refilled.discardPile[0].id === 't', 'deja superior');
  assert(refilled.drawPile.length === 2, 'rebaraja el resto');
  const drawn = drawCards([], discard, 5, createRng(2));
  assert(drawn.drawn.length >= 1, 'roba tras reponer');
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
