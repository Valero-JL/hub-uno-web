/**
 * HUB-UNO — ModalManager: color, reglas, ajustes y resultado.
 */

import { COLOR_LABELS } from './constants.js';

/**
 * @param {HTMLElement} root
 */
export function createModalManager(root) {
  /** @type {HTMLElement|null} */
  let lastFocus = null;
  /** @type {((color: string) => void)|null} */
  let colorResolver = null;

  const els = {
    root,
    title: root.querySelector('#modal-title'),
    body: root.querySelector('#modal-body'),
    actions: root.querySelector('#modal-actions'),
  };

  function open({ title, bodyHtml, actions = [], mandatory = false, labelledBy = 'modal-title' }) {
    lastFocus = /** @type {HTMLElement} */ (document.activeElement);
    els.title.textContent = title;
    els.body.innerHTML = bodyHtml;
    els.actions.innerHTML = '';
    for (const a of actions) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = a.label;
      btn.className = a.className || '';
      btn.addEventListener('click', () => {
        if (a.close !== false) close();
        a.onClick?.();
      });
      els.actions.appendChild(btn);
    }
    root.hidden = false;
    root.dataset.mandatory = mandatory ? '1' : '0';
    root.setAttribute('aria-labelledby', labelledBy);
    const focusable = root.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    /** @type {HTMLElement|null} */ (focusable)?.focus();
  }

  function close() {
    if (root.dataset.mandatory === '1') return;
    root.hidden = true;
    els.body.innerHTML = '';
    els.actions.innerHTML = '';
    lastFocus?.focus?.();
  }

  function forceClose() {
    root.dataset.mandatory = '0';
    close();
  }

  /**
   * Modal de elección de color (obligatorio).
   * @returns {Promise<string>}
   */
  function chooseColor() {
    return new Promise((resolve) => {
      colorResolver = resolve;
      const buttons = Object.entries(COLOR_LABELS)
        .map(
          ([key, label]) =>
            `<button type="button" class="color-btn" data-color="${key}" aria-label="${label}">${label}</button>`,
        )
        .join('');
      open({
        title: 'Elige un color',
        bodyHtml: `<div class="color-grid">${buttons}</div><p>Debes elegir un color para continuar.</p>`,
        actions: [],
        mandatory: true,
      });
      els.body.querySelectorAll('.color-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const color = btn.getAttribute('data-color');
          forceClose();
          colorResolver?.(color);
          colorResolver = null;
        });
      });
    });
  }

  function showRules() {
    open({
      title: 'Cómo se juega',
      bodyHtml: `
        <ul class="rules-list">
          <li><strong>Objetivo:</strong> sé el primero en quedarte sin cartas.</li>
          <li><strong>Jugada válida:</strong> mismo color, mismo número o mismo símbolo. Los comodines valen siempre.</li>
          <li><strong>Giro:</strong> invierte el sentido (en 2 jugadores salta).</li>
          <li><strong>Bloqueo:</strong> el siguiente pierde el turno.</li>
          <li><strong>Robo (+2):</strong> el siguiente roba 2 y pierde turno. Se puede apilar +2 sobre +2.</li>
          <li><strong>Comodín:</strong> eliges el color activo.</li>
          <li><strong>Super Robo (+4):</strong> eliges color y el siguiente roba 4. Se apila +4 sobre +4.</li>
          <li>Si no puedes jugar, roba una carta. Si es jugable, puedes usarla al momento.</li>
        </ul>
      `,
      actions: [{ label: 'Entendido', className: 'btn-amber' }],
    });
  }

  /**
   * @param {{ won: boolean, winnerName: string, turns: number, drawn: number }} result
   * @param {{ onAgain: () => void, onMenu: () => void }} handlers
   */
  function showResult(result, handlers) {
    open({
      title: result.won ? '¡Victoria!' : 'Derrota',
      bodyHtml: `
        <p>${result.won ? 'Has ganado la partida.' : `${result.winnerName} se ha quedado sin cartas.`}</p>
        <p>Turnos: <strong>${result.turns}</strong> · Cartas que robaste: <strong>${result.drawn}</strong></p>
      `,
      actions: [
        { label: 'Jugar otra vez', className: 'btn-amber', onClick: handlers.onAgain },
        { label: 'Menú', className: 'btn-ghost', onClick: handlers.onMenu },
      ],
    });
  }

  /**
   * @param {object} settings
   * @param {object} handlers
   */
  function showPause(settings, handlers) {
    open({
      title: 'Menú',
      bodyHtml: `
        <div class="toggles">
          <label class="toggle"><input type="checkbox" id="pause-sound" ${settings.sound ? 'checked' : ''}/> Sonido</label>
          <label class="toggle"><input type="checkbox" id="pause-anim" ${settings.animations ? 'checked' : ''}/> Animaciones</label>
          <label class="toggle"><input type="checkbox" id="pause-dark" ${settings.darkMode === true ? 'checked' : ''}/> Modo oscuro</label>
        </div>
      `,
      actions: [
        {
          label: 'Aplicar',
          className: 'btn-amber',
          onClick: () => {
            handlers.onApply?.({
              sound: /** @type {HTMLInputElement} */ (document.getElementById('pause-sound')).checked,
              animations: /** @type {HTMLInputElement} */ (document.getElementById('pause-anim')).checked,
              darkMode: /** @type {HTMLInputElement} */ (document.getElementById('pause-dark')).checked,
            });
          },
        },
        { label: 'Reglas', className: 'btn-ghost', close: false, onClick: () => { forceClose(); showRules(); } },
        { label: 'Reiniciar', className: 'btn-ghost', onClick: handlers.onRestart },
        { label: 'Abandonar', className: 'btn-danger', onClick: handlers.onAbandon },
        { label: 'Cerrar', className: 'btn-ghost' },
      ],
    });
  }

  root.addEventListener('click', (e) => {
    if (e.target === root && root.dataset.mandatory !== '1') close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !root.hidden && root.dataset.mandatory !== '1') {
      close();
    }
  });

  return {
    open,
    close,
    forceClose,
    chooseColor,
    showRules,
    showResult,
    showPause,
  };
}
