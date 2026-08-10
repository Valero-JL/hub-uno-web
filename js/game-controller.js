/**
 * HUB-UNO — GameController: orquestación del ciclo de juego.
 */

import { createGame, pushHistory, buildPublicView } from './game-state.js';
import { isPlayable, getPlayableCards, resolveCardEffect } from './rules.js';
import { nextPlayerIndex } from './turns.js';
import { drawCards } from './deck.js';
import { decideBotAction, decidePlayDrawn } from './bots.js';
import { compareCards } from './card.js';
import { BOT_DELAY_MIN, BOT_DELAY_MAX, BOT_DELAY_REDUCED } from './constants.js';

/**
 * @typedef {Object} GameController
 * @property {import('./game-state.js').GameState} state
 * @property {(state: import('./game-state.js').GameState) => void} onChange
 * @property {(req: { type: string, resolve: Function }) => void} onModal
 */

/**
 * Crea el controlador.
 * @param {object} hooks
 * @param {(state: import('./game-state.js').GameState) => void} hooks.onChange
 * @param {(req: object) => void} [hooks.onModal]
 * @param {(event: string, detail?: object) => void} [hooks.onAudio]
 * @returns {object}
 */
export function createController(hooks) {
  /** @type {import('./game-state.js').GameState|null} */
  let state = null;
  let botTimer = null;
  let destroyed = false;

  function emit() {
    if (state && hooks.onChange) hooks.onChange(state);
  }

  function lock(v = true) {
    if (state) state.inputLocked = v;
  }

  /**
   * Inicia partida.
   * @param {object} config
   * @param {{ seed?: number }} [opts]
   */
  function start(config, opts = {}) {
    clearBotTimer();
    state = createGame(config, opts);
    emit();
    scheduleTurn();
  }

  function getState() {
    return state;
  }

  function currentPlayer() {
    return state?.players[state.currentPlayerIndex] || null;
  }

  function ruleState() {
    return {
      topCard: state.topCard,
      activeColor: state.activeColor,
      pendingDraw: state.pendingDraw,
      pendingDrawType: state.pendingDrawType,
      rules: state.config.rules,
    };
  }

  function scheduleTurn() {
    if (!state || state.status !== 'playing') return;
    const player = currentPlayer();
    if (!player) return;

    if (player.isHuman) {
      lock(false);
      emit();
      // Si hay penalización y no puede apilar, auto-robo tras breve feedback
      if (state.pendingDraw > 0) {
        const playable = getPlayableCards(player.hand, ruleState());
        if (playable.length === 0) {
          // El humano debe pulsar Robar, o auto-aplicamos tras mostrar badge
          emit();
        }
      }
      return;
    }

    // Bot
    lock(true);
    emit();
    const delay = botDelay();
    botTimer = setTimeout(() => {
      if (destroyed || !state || state.status !== 'playing') return;
      runBotTurn().catch((err) => {
        console.warn('Bot turn error', err);
        endTurn(0);
      });
    }, delay);
  }

  function botDelay() {
    if (!state?.config.animations) return BOT_DELAY_REDUCED;
    return BOT_DELAY_MIN + Math.random() * (BOT_DELAY_MAX - BOT_DELAY_MIN);
  }

  async function runBotTurn() {
    const player = currentPlayer();
    if (!player || player.isHuman) return;

    const view = buildPublicView(state, state.currentPlayerIndex);
    const decision = decideBotAction(view, player.difficulty || 'normal');

    if (decision.action === 'drawPenalty') {
      applyPenaltyDraw();
      return;
    }

    if (decision.action === 'draw') {
      const drawn = voluntaryDraw();
      if (drawn && state.config.rules.playDrawnCard) {
        const view2 = buildPublicView(state, state.currentPlayerIndex);
        const play = decidePlayDrawn(drawn, view2, player.difficulty || 'normal');
        if (play.play && isPlayable(drawn, ruleState())) {
          await playCard(drawn.id, play.color);
          return;
        }
      }
      pushHistory(state, player.id, 'draw', `${player.name} robó una carta.`);
      emit();
      endTurn(0);
      return;
    }

    if (decision.action === 'play' && decision.cardId) {
      await playCard(decision.cardId, decision.color);
    }
  }

  /**
   * Jugada humana o bot.
   * @param {string} cardId
   * @param {string} [chosenColor]
   */
  async function playCard(cardId, chosenColor) {
    if (!state || state.status !== 'playing') return { ok: false, reason: 'not_playing' };
    const player = currentPlayer();
    if (!player) return { ok: false, reason: 'no_player' };

    const cardIndex = player.hand.findIndex((c) => c.id === cardId);
    if (cardIndex < 0) return { ok: false, reason: 'not_in_hand' };

    const card = player.hand[cardIndex];
    if (!isPlayable(card, ruleState())) {
      return { ok: false, reason: 'not_playable' };
    }

    lock(true);

    // Quitar de mano y poner en descarte
    player.hand.splice(cardIndex, 1);
    state.discardPile.push(card);
    state.topCard = card;
    state.drawnCardOffer = null;

    if (card.color) state.activeColor = card.color;

    const effect = resolveCardEffect(card, {
      direction: state.direction,
      pendingDraw: state.pendingDraw,
      pendingDrawType: state.pendingDrawType,
      playerCount: state.players.length,
      stacking: state.config.rules.stacking,
    });

    state.direction = /** @type {1|-1} */ (effect.direction);

    // Color choice
    let color = chosenColor || null;
    if (effect.needsColorChoice) {
      if (!color) {
        if (player.isHuman) {
          color = await requestColor();
        } else {
          const view = buildPublicView(state, state.currentPlayerIndex);
          const { chooseColor } = await import('./bots.js');
          color = chooseColor(view, player.difficulty || 'normal');
        }
      }
      state.activeColor = color;
    } else if (effect.activeColor) {
      state.activeColor = effect.activeColor;
    }

    // Penalización
    if (card.type === 'draw2' || card.type === 'wild_draw4') {
      state.pendingDraw = effect.pendingDraw;
      state.pendingDrawType = effect.pendingDrawType;
    } else if (state.pendingDraw > 0 && card.type !== 'draw2' && card.type !== 'wild_draw4') {
      // No debería ocurrir por validación
      state.pendingDraw = 0;
      state.pendingDrawType = null;
    }

    pushHistory(
      state,
      player.id,
      'play',
      `${player.name} jugó ${card.label}${color ? ` → ${colorLabel(color)}` : ''}.`,
    );
    hooks.onAudio?.('play');

    // Victoria
    if (player.hand.length === 0) {
      state.status = 'finished';
      state.winner = player.id;
      pushHistory(state, player.id, 'win', `${player.name} gana la partida.`);
      emit();
      return { ok: true, win: true };
    }

    // Avance de turno
    // Si hay pendingDraw, el siguiente jugador debe responder (no se salta aún).
    // Si es skip/reverse-as-skip, aplicar skipCount.
    let skip = effect.skipCount || 0;

    // Cartas de robo: el siguiente enfrenta la penalización (no saltamos extra aquí).
    // El salto ocurre cuando pagan la penalización (applyPenaltyDraw).

    emit();
    endTurn(skip);
    return { ok: true };
  }

  function colorLabel(c) {
    const map = { red: 'Carmesí', yellow: 'Ámbar', green: 'Jade', blue: 'Cobalto' };
    return map[c] || c;
  }

  function requestColor() {
    return new Promise((resolve) => {
      if (hooks.onModal) {
        hooks.onModal({ type: 'color', resolve });
      } else {
        resolve('red');
      }
    });
  }

  /**
   * Robo voluntario (humano o bot).
   * @returns {import('./card.js').Card|null}
   */
  function voluntaryDraw() {
    if (!state || state.status !== 'playing') return null;
    const player = currentPlayer();
    if (!player) return null;

    // Si hay penalización, es drawPenalty
    if (state.pendingDraw > 0) {
      applyPenaltyDraw();
      return null;
    }

    // Si tiene jugables, aún puede elegir robar
    const { drawn, drawPile, discardPile, shortfall } = drawCards(
      state.drawPile,
      state.discardPile,
      1,
    );
    state.drawPile = drawPile;
    state.discardPile = discardPile;
    if (shortfall) {
      pushHistory(state, player.id, 'shortfall', 'No había cartas suficientes en el mazo.');
    }
    const card = drawn[0] || null;
    if (card) {
      player.hand.push(card);
      state.stats.cardsDrawn[player.id] = (state.stats.cardsDrawn[player.id] || 0) + 1;
      hooks.onAudio?.('draw');
    }
    return card;
  }

  /**
   * Acción humana: robar.
   */
  function humanDraw() {
    if (!state || state.status !== 'playing' || state.inputLocked) return;
    const player = currentPlayer();
    if (!player?.isHuman) return;

    if (state.pendingDraw > 0) {
      applyPenaltyDraw();
      return;
    }

    lock(true);
    const card = voluntaryDraw();
    if (!card) {
      endTurn(0);
      return;
    }

    pushHistory(state, player.id, 'draw', `${player.name} robó una carta.`);

    if (state.config.rules.playDrawnCard && isPlayable(card, ruleState())) {
      state.drawnCardOffer = card;
      lock(false);
      emit();
      return;
    }

    emit();
    endTurn(0);
  }

  /**
   * Humano acepta jugar la carta robada.
   * @param {string} [color]
   */
  async function humanPlayDrawn(color) {
    if (!state?.drawnCardOffer) return;
    const card = state.drawnCardOffer;
    state.drawnCardOffer = null;
    await playCard(card.id, color);
  }

  /** Humano declina jugar la carta robada. */
  function humanKeepDrawn() {
    if (!state) return;
    state.drawnCardOffer = null;
    emit();
    endTurn(0);
  }

  /**
   * Humano juega carta de la mano.
   * @param {string} cardId
   * @param {string} [color]
   */
  async function humanPlay(cardId, color) {
    if (!state || state.status !== 'playing' || state.inputLocked) return { ok: false };
    const player = currentPlayer();
    if (!player?.isHuman) return { ok: false };
    if (state.drawnCardOffer) return { ok: false, reason: 'resolve_drawn' };
    return playCard(cardId, color);
  }

  function applyPenaltyDraw() {
    if (!state) return;
    const player = currentPlayer();
    const n = state.pendingDraw;
    const { drawn, drawPile, discardPile, shortfall } = drawCards(
      state.drawPile,
      state.discardPile,
      n,
    );
    state.drawPile = drawPile;
    state.discardPile = discardPile;
    for (const c of drawn) player.hand.push(c);
    state.stats.cardsDrawn[player.id] = (state.stats.cardsDrawn[player.id] || 0) + drawn.length;
    if (shortfall) {
      pushHistory(
        state,
        player.id,
        'shortfall',
        `${player.name} debía robar ${n} pero solo hubo ${drawn.length}.`,
      );
    }
    pushHistory(state, player.id, 'penalty', `${player.name} robó ${drawn.length} (penalización).`);
    hooks.onAudio?.('draw');
    state.pendingDraw = 0;
    state.pendingDrawType = null;
    emit();
    // Pierde el turno
    endTurn(0);
  }

  /**
   * Finaliza turno y avanza.
   * @param {number} skipCount
   */
  function endTurn(skipCount) {
    if (!state || state.status !== 'playing') return;
    state.stats.turnsPlayed += 1;
    state.drawnCardOffer = null;
    state.currentPlayerIndex = nextPlayerIndex(
      state.currentPlayerIndex,
      state.players.length,
      state.direction,
      skipCount,
    );
    emit();
    scheduleTurn();
  }

  function sortHumanHand() {
    if (!state) return;
    const human = state.players.find((p) => p.isHuman);
    if (!human) return;
    human.hand.sort(compareCards);
    emit();
  }

  function abandon() {
    clearBotTimer();
    if (state) {
      state.status = 'setup';
      emit();
    }
  }

  function restart() {
    if (!state) return;
    const cfg = state.config;
    start(cfg);
  }

  function clearBotTimer() {
    if (botTimer) {
      clearTimeout(botTimer);
      botTimer = null;
    }
  }

  function destroy() {
    destroyed = true;
    clearBotTimer();
  }

  return {
    start,
    getState,
    humanPlay,
    humanDraw,
    humanPlayDrawn,
    humanKeepDrawn,
    sortHumanHand,
    abandon,
    restart,
    destroy,
    applyPenaltyDraw,
    getPlayableCards: () => {
      if (!state) return [];
      const p = currentPlayer();
      if (!p) return [];
      return getPlayableCards(p.hand, ruleState());
    },
  };
}
