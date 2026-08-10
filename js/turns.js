/**
 * HUB-UNO — TurnManager: siguiente jugador, dirección y saltos.
 */

/**
 * Calcula el siguiente índice de jugador.
 * @param {number} currentIndex
 * @param {number} playerCount
 * @param {number} direction - 1 horario, -1 antihorario
 * @param {number} [skipCount=0] - saltos adicionales (Bloqueo / Giro en 2p / tras penalización)
 * @returns {number}
 */
export function nextPlayerIndex(currentIndex, playerCount, direction, skipCount = 0) {
  if (playerCount <= 0) return 0;
  // Avance normal + saltos: skipCount=1 salta al siguiente del siguiente
  const steps = 1 + (skipCount || 0);
  let idx = currentIndex;
  for (let i = 0; i < steps; i++) {
    idx = (idx + direction + playerCount * 10) % playerCount;
  }
  return idx;
}

/**
 * Índice del jugador que recibiría el efecto de "siguiente" (Bloqueo/Robo).
 * @param {number} currentIndex
 * @param {number} playerCount
 * @param {number} direction
 * @returns {number}
 */
export function targetPlayerIndex(currentIndex, playerCount, direction) {
  return nextPlayerIndex(currentIndex, playerCount, direction, 0);
}

/**
 * Avanza el turno tras una jugada, aplicando saltos.
 * @param {{ currentPlayerIndex: number, direction: number, players: unknown[] }} state
 * @param {{ skipCount?: number }} [opts]
 * @returns {number} nuevo currentPlayerIndex
 */
export function advanceTurn(state, opts = {}) {
  return nextPlayerIndex(
    state.currentPlayerIndex,
    state.players.length,
    state.direction,
    opts.skipCount || 0,
  );
}
