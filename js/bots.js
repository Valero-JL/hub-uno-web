/**
 * HUB-UNO — BotStrategy: IA por dificultad (solo vista pública).
 */

import { getPlayableCards } from './rules.js';
import { COLORS } from './constants.js';

/**
 * Decide la acción del bot a partir de una vista pública.
 * @param {object} view - Vista pública (sección 16.4)
 * @param {'easy'|'normal'|'hard'} difficulty
 * @param {() => number} [rng]
 * @returns {{ action: 'play'|'draw'|'drawPenalty', cardId?: string, color?: string }}
 */
export function decideBotAction(view, difficulty = 'normal', rng = Math.random) {
  const playable = getPlayableCards(view.myHand, {
    topCard: view.topCard,
    activeColor: view.activeColor,
    pendingDraw: view.pendingDraw,
    pendingDrawType: view.pendingDrawType,
    rules: view.rules,
  });

  // Penalización pendiente: apilar o robar
  if (view.pendingDraw > 0) {
    if (playable.length === 0) {
      return { action: 'drawPenalty' };
    }
    if (difficulty === 'easy' && rng() < 0.4) {
      return { action: 'drawPenalty' };
    }
    const card = chooseCard(playable, view, difficulty, rng);
    const color = needsColor(card) ? chooseColor(view, difficulty, rng) : undefined;
    return { action: 'play', cardId: card.id, color };
  }

  if (playable.length === 0) {
    return { action: 'draw' };
  }

  const card = chooseCard(playable, view, difficulty, rng);
  const color = needsColor(card) ? chooseColor(view, difficulty, rng) : undefined;
  return { action: 'play', cardId: card.id, color };
}

/**
 * Tras robar voluntariamente, ¿juega la carta robada?
 * @param {import('./card.js').Card} drawn
 * @param {object} view
 * @param {'easy'|'normal'|'hard'} difficulty
 * @param {() => number} [rng]
 * @returns {{ play: boolean, color?: string }}
 */
export function decidePlayDrawn(drawn, view, difficulty = 'normal', rng = Math.random) {
  const playable = getPlayableCards([drawn], {
    topCard: view.topCard,
    activeColor: view.activeColor,
    pendingDraw: 0,
    pendingDrawType: null,
    rules: view.rules,
  });
  if (!playable.length) return { play: false };

  if (difficulty === 'easy') {
    return {
      play: rng() < 0.7,
      color: needsColor(drawn) ? chooseColor(view, difficulty, rng) : undefined,
    };
  }
  // Normal/Difícil: jugar si reduce mano o es útil
  return {
    play: true,
    color: needsColor(drawn) ? chooseColor(view, difficulty, rng) : undefined,
  };
}

/** @param {import('./card.js').Card} card */
function needsColor(card) {
  return card.type === 'wild' || card.type === 'wild_draw4';
}

/**
 * @param {import('./card.js').Card[]} playable
 * @param {object} view
 * @param {string} difficulty
 * @param {() => number} rng
 */
function chooseCard(playable, view, difficulty, rng) {
  if (difficulty === 'easy') {
    return playable[Math.floor(rng() * playable.length)];
  }

  let best = playable[0];
  let bestScore = -Infinity;
  for (const card of playable) {
    const score = scoreCard(card, view, difficulty, rng);
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }
  return best;
}

/**
 * Función de puntuación (Normal / Difícil).
 * @param {import('./card.js').Card} card
 * @param {object} view
 * @param {string} difficulty
 * @param {() => number} rng
 */
function scoreCard(card, view, difficulty, rng) {
  let score = 10 + rng() * 0.5; // desempate suave
  const next = view.opponents.find((o) => o.isNext);
  const lowest = [...view.opponents].sort((a, b) => a.cardCount - b.cardCount)[0];
  const myCount = view.myHand.length;

  // Preferir reducir mano (valores altos / acciones)
  if (card.type === 'number') {
    score += (card.value || 0) * 0.3;
  }

  if (card.type === 'skip' || card.type === 'draw2' || card.type === 'reverse') {
    score += difficulty === 'hard' ? 8 : 5;
    if (next && next.cardCount <= 3) score += difficulty === 'hard' ? 12 : 6;
    if (lowest && next && next.id === lowest.id && lowest.cardCount <= 2) {
      score += difficulty === 'hard' ? 15 : 4;
    }
  }

  if (card.type === 'wild' || card.type === 'wild_draw4') {
    // Conservar comodines
    const nonWildPlayable = view.myHand.filter(
      (c) => c.type !== 'wild' && c.type !== 'wild_draw4' &&
        getPlayableCards([c], {
          topCard: view.topCard,
          activeColor: view.activeColor,
          pendingDraw: view.pendingDraw,
          pendingDrawType: view.pendingDrawType,
          rules: view.rules,
        }).length,
    );
    if (nonWildPlayable.length > 0 && myCount > 2) {
      score -= difficulty === 'hard' ? 20 : 10;
    } else {
      score += 5;
    }
    if (card.type === 'wild_draw4' && next && next.cardCount <= 3) {
      score += difficulty === 'hard' ? 18 : 8;
    }
  }

  // Apilar cuando beneficia
  if (view.pendingDraw > 0 && (card.type === 'draw2' || card.type === 'wild_draw4')) {
    score += difficulty === 'hard' ? 14 : 8;
  }

  // Preferir color dominante
  const dominant = dominantColor(view.myHand);
  if (card.color && card.color === dominant) score += 3;

  return score;
}

/**
 * Política de color.
 * @param {object} view
 * @param {string} difficulty
 * @param {() => number} rng
 * @returns {string}
 */
export function chooseColor(view, difficulty, rng = Math.random) {
  if (difficulty === 'easy' && rng() < 0.5) {
    return COLORS[Math.floor(rng() * COLORS.length)];
  }

  const counts = colorCounts(view.myHand);
  let best = COLORS[0];
  let bestN = -1;
  for (const c of COLORS) {
    if (counts[c] > bestN) {
      bestN = counts[c];
      best = c;
    } else if (counts[c] === bestN && rng() < 0.5) {
      best = c;
    }
  }

  if (difficulty === 'hard') {
    // Intentar negar color al rival siguiente si tenemos empate
    const next = view.opponents.find((o) => o.isNext);
    if (next && next.cardCount <= 2) {
      // Heurística: elegir el color más frecuente propio (ya hecho)
      // y evitar colores vistos mucho en descarte reciente del siguiente no es fiable;
      // preferimos nuestro color dominante.
    }
  }

  return best;
}

/** @param {import('./card.js').Card[]} hand */
function dominantColor(hand) {
  const counts = colorCounts(hand);
  let best = COLORS[0];
  let n = -1;
  for (const c of COLORS) {
    if (counts[c] > n) {
      n = counts[c];
      best = c;
    }
  }
  return best;
}

/** @param {import('./card.js').Card[]} hand */
function colorCounts(hand) {
  /** @type {Record<string, number>} */
  const counts = { red: 0, yellow: 0, green: 0, blue: 0 };
  for (const c of hand) {
    if (c.color && counts[c.color] !== undefined) counts[c.color]++;
  }
  return counts;
}
