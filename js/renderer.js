/**
 * HUB-UNO — Renderer: estado → DOM.
 */

import { cardImageSrc, cardBackSrc, COLOR_HEX, COLOR_LABELS } from './constants.js';
import { cardAriaLabel } from './card.js';
import { getPlayableCards } from './rules.js';

/**
 * @param {object} els - Referencias DOM
 */
export function createRenderer(els) {
  /**
   * @param {import('./game-state.js').GameState} state
   * @param {{ playableIds?: Set<string>, onCardClick?: (id: string) => void, onDrawClick?: () => void }} [ctx]
   */
  function render(state, ctx = {}) {
    if (!state || state.status === 'setup') {
      els.screenSetup.classList.add('is-active');
      els.screenGame.classList.remove('is-active');
      return;
    }

    els.screenSetup.classList.remove('is-active');
    els.screenGame.classList.add('is-active');

    renderBots(state);
    renderPiles(state, ctx);
    renderStatus(state);
    renderHand(state, ctx);
    renderHistory(state);
    renderDrawnOffer(state);
    announce(state);
  }

  function renderBots(state) {
    const rail = els.botsRail;
    rail.innerHTML = '';
    state.players.forEach((p, i) => {
      if (p.isHuman) return;
      const chip = document.createElement('div');
      chip.className = 'bot-chip' + (i === state.currentPlayerIndex ? ' is-active' : '');
      chip.setAttribute('aria-label', `${p.name}, ${p.hand.length} cartas${i === state.currentPlayerIndex ? ', turno actual' : ''}`);
      chip.innerHTML = `
        <div class="bot-chip__avatar" aria-hidden="true">${p.name.slice(0, 1)}</div>
        <div class="bot-chip__meta">
          <span class="bot-chip__name">${escapeHtml(p.name)}</span>
          <span class="bot-chip__count">${p.hand.length} cartas</span>
        </div>
      `;
      rail.appendChild(chip);
    });
  }

  function renderPiles(state, ctx) {
    els.discardPile.innerHTML = '';
    els.drawPile.innerHTML = '';

    if (state.topCard) {
      els.discardPile.appendChild(createCardEl(state.topCard, { pile: true }));
    }

    const back = createBackEl({
      button: true,
      disabled: state.inputLocked || !state.players[state.currentPlayerIndex]?.isHuman || !!state.drawnCardOffer,
      onClick: ctx.onDrawClick,
    });
    els.drawPile.appendChild(back);
  }

  function renderStatus(state) {
    const color = state.activeColor;
    els.activeColorBadge.style.setProperty('--badge-color', COLOR_HEX[color] || '#fff');
    els.activeColorBadge.textContent = COLOR_LABELS[color] || color || '—';

    els.directionBadge.textContent = state.direction === 1 ? 'Horario ⟳' : 'Antihorario ⟲';

    if (state.pendingDraw > 0) {
      els.penaltyBadge.hidden = false;
      els.penaltyBadge.removeAttribute('hidden');
      els.penaltyBadge.textContent = `+${state.pendingDraw}`;
      els.penaltyBadge.style.display = '';
    } else {
      els.penaltyBadge.hidden = true;
      els.penaltyBadge.setAttribute('hidden', '');
      els.penaltyBadge.style.display = 'none';
      els.penaltyBadge.textContent = '';
    }

    const current = state.players[state.currentPlayerIndex];
    els.turnBadge.textContent = current ? `Turno: ${current.name}` : '';

    els.humanArea.classList.toggle('is-active', !!current?.isHuman);
  }

  function renderHand(state, ctx) {
    const human = state.players.find((p) => p.isHuman);
    if (!human) return;

    const isHumanTurn = state.players[state.currentPlayerIndex]?.isHuman && !state.inputLocked;
    const playable = isHumanTurn && !state.drawnCardOffer
      ? getPlayableCards(human.hand, {
          topCard: state.topCard,
          activeColor: state.activeColor,
          pendingDraw: state.pendingDraw,
          pendingDrawType: state.pendingDrawType,
          rules: state.config.rules,
        })
      : [];
    const playableIds = new Set(playable.map((c) => c.id));

    els.hand.innerHTML = '';
    els.hand.setAttribute('role', 'listbox');
    els.hand.setAttribute('aria-label', 'Tu mano');

    human.hand.forEach((card) => {
      const canPlay = playableIds.has(card.id);
      const el = createCardEl(card, {
        playable: canPlay,
        button: true,
        disabled: !canPlay,
        onClick: canPlay ? () => ctx.onCardClick?.(card.id) : undefined,
      });
      el.setAttribute('role', 'option');
      el.setAttribute('aria-selected', 'false');
      els.hand.appendChild(el);
    });

    // Controles
    const canDraw = isHumanTurn && !state.drawnCardOffer;
    els.btnDraw.disabled = !canDraw;
    els.btnSort.disabled = false;
  }

  function renderHistory(state) {
    const last = state.history.slice(-3).map((h) => h.text).join(' · ');
    els.historyToast.textContent = last;
  }

  function renderDrawnOffer(state) {
    const offer = state.drawnCardOffer;
    els.drawnOffer.classList.toggle('is-visible', !!offer);
    if (offer) {
      els.drawnOfferText.textContent = `Carta robada: ${offer.label}. ¿Jugarla?`;
    }
  }

  function announce(state) {
    if (!els.live) return;
    const current = state.players[state.currentPlayerIndex];
    if (!current) return;
    const last = state.history[state.history.length - 1];
    const parts = [`Turno de ${current.name}`];
    if (last) parts.push(last.text);
    if (state.pendingDraw > 0) parts.push(`Penalización pendiente +${state.pendingDraw}`);
    els.live.textContent = parts.join('. ');
  }

  /**
   * @param {import('./card.js').Card} card
   * @param {object} opts
   */
  function createCardEl(card, opts = {}) {
    const el = document.createElement(opts.button ? 'button' : 'div');
    el.type = opts.button ? 'button' : undefined;
    el.className = 'card' + (opts.pile ? ' card--pile' : '') + (opts.playable ? ' is-playable' : '');
    el.dataset.cardId = card.id;
    el.disabled = !!opts.disabled;
    el.setAttribute('aria-label', cardAriaLabel(card, { playable: opts.playable }));
    el.style.setProperty('--card-color', COLOR_HEX[card.color] || '#333');

    const img = document.createElement('img');
    img.className = 'card__img';
    img.alt = '';
    img.decoding = 'async';
    img.src = cardImageSrc(card);
    img.addEventListener('error', () => {
      console.warn('Card image failed:', img.src);
      el.classList.add('is-fallback');
    });

    const fallback = document.createElement('div');
    fallback.className = 'card__fallback';
    fallback.setAttribute('aria-hidden', 'true');
    const value = card.type === 'number' ? String(card.value)
      : card.type === 'draw2' ? '+2'
        : card.type === 'wild_draw4' ? '+4'
          : card.type === 'wild' ? '★'
            : card.type === 'reverse' ? '⟳'
              : card.type === 'skip' ? '⊘' : '?';
    fallback.innerHTML = `<span class="card__fallback-value">${value}</span><span class="card__fallback-sub">${escapeHtml(card.label)}</span>`;

    const badge = document.createElement('span');
    badge.className = 'card__badge';
    badge.textContent = card.type === 'number' ? String(card.value) : (card.symbol || card.type);

    el.appendChild(img);
    el.appendChild(fallback);
    el.appendChild(badge);

    if (opts.onClick) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        opts.onClick();
      });
    }

    return el;
  }

  function createBackEl(opts = {}) {
    const el = document.createElement(opts.button ? 'button' : 'div');
    if (opts.button) el.type = 'button';
    el.className = 'card card--pile card--draw card--back';
    el.setAttribute('aria-label', 'Mazo de robo');
    el.disabled = !!opts.disabled;

    const img = document.createElement('img');
    img.className = 'card__img';
    img.alt = '';
    img.src = cardBackSrc();
    img.addEventListener('error', () => {
      el.classList.add('is-fallback');
    });

    const fallback = document.createElement('div');
    fallback.className = 'card__fallback';
    fallback.innerHTML = '<span class="card__fallback-value">HUB</span><span class="card__fallback-sub">UNO</span>';

    el.appendChild(img);
    el.appendChild(fallback);

    if (opts.onClick) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        if (!el.disabled) opts.onClick();
      });
    }
    return el;
  }

  return { render };
}

/** @param {string} s */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
