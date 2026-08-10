/**
 * HUB-UNO — Bootstrap: Settings, Storage, UI de inicio y ciclo de juego.
 */

import { MIN_PLAYERS, MAX_PLAYERS } from './constants.js';
import { defaultBotNames } from './players.js';
import { loadAppSettings, persistAppSettings, applyTheme, shouldAnimate } from './settings.js';
import { createAudioManager } from './audio.js';
import { createModalManager } from './modals.js';
import { createRenderer } from './renderer.js';
import { createController } from './game-controller.js';
import { isPlayable } from './rules.js';

const audio = createAudioManager();
/** @type {ReturnType<typeof createController>|null} */
let controller = null;
/** @type {ReturnType<typeof loadAppSettings>} */
let settings = loadAppSettings();

const els = {
  screenSetup: document.getElementById('screen-setup'),
  screenGame: document.getElementById('screen-game'),
  form: document.getElementById('setup-form'),
  playerName: document.getElementById('player-name'),
  playerCount: document.getElementById('player-count'),
  playerCountOut: document.getElementById('player-count-out'),
  playerCountHint: document.getElementById('player-count-hint'),
  botNames: document.getElementById('bot-names'),
  difficulty: document.getElementById('difficulty'),
  stacking: document.getElementById('opt-stacking'),
  sound: document.getElementById('opt-sound'),
  animations: document.getElementById('opt-animations'),
  darkMode: document.getElementById('opt-dark'),
  btnRules: document.getElementById('btn-rules'),
  btnPlay: document.getElementById('btn-play'),
  botsRail: document.getElementById('bots-rail'),
  discardPile: document.getElementById('discard-pile'),
  drawPile: document.getElementById('draw-pile'),
  activeColorBadge: document.getElementById('badge-color'),
  directionBadge: document.getElementById('badge-direction'),
  penaltyBadge: document.getElementById('badge-penalty'),
  turnBadge: document.getElementById('badge-turn'),
  historyToast: document.getElementById('history-toast'),
  hand: document.getElementById('hand'),
  humanArea: document.getElementById('human-area'),
  btnDraw: document.getElementById('btn-draw'),
  btnSort: document.getElementById('btn-sort'),
  btnMenu: document.getElementById('btn-menu'),
  btnGameRules: document.getElementById('btn-game-rules'),
  drawnOffer: document.getElementById('drawn-offer'),
  drawnOfferText: document.getElementById('drawn-offer-text'),
  btnPlayDrawn: document.getElementById('btn-play-drawn'),
  btnKeepDrawn: document.getElementById('btn-keep-drawn'),
  live: document.getElementById('live-region'),
  modalRoot: document.getElementById('modal-root'),
};

const modals = createModalManager(els.modalRoot);
const renderer = createRenderer(els);

function init() {
  applySettingsToUI();
  applyTheme(settings.darkMode);
  audio.setEnabled(settings.sound);
  document.body.classList.toggle('animations-on', shouldAnimate(settings.animations));

  els.playerCount.addEventListener('input', () => {
    syncPlayerCountUI();
    renderBotNameInputs();
  });

  els.form.addEventListener('submit', (e) => {
    e.preventDefault();
    startGame();
  });

  els.btnRules.addEventListener('click', () => modals.showRules());
  els.btnGameRules.addEventListener('click', () => modals.showRules());
  els.btnMenu.addEventListener('click', openPause);
  els.btnDraw.addEventListener('click', () => controller?.humanDraw());
  els.btnSort.addEventListener('click', () => controller?.sortHumanHand());
  els.btnPlayDrawn.addEventListener('click', async () => {
    const state = controller?.getState();
    const card = state?.drawnCardOffer;
    if (!card) return;
    if (card.type === 'wild' || card.type === 'wild_draw4') {
      const color = await modals.chooseColor();
      await controller?.humanPlayDrawn(color);
    } else {
      await controller?.humanPlayDrawn();
    }
  });
  els.btnKeepDrawn.addEventListener('click', () => controller?.humanKeepDrawn());

  // Atajos teclado
  document.addEventListener('keydown', (e) => {
    const state = controller?.getState();
    if (!state || state.status !== 'playing') return;
    if (e.key === 'Escape') {
      // color modal handles its own
      return;
    }
  });

  syncPlayerCountUI();
  renderBotNameInputs();
  renderer.render({ status: 'setup' });
}

function applySettingsToUI() {
  els.playerName.value = settings.playerName;
  els.playerCount.value = String(settings.totalPlayers);
  els.difficulty.value = settings.difficulty;
  els.stacking.checked = settings.rules.stacking;
  els.sound.checked = settings.sound;
  els.animations.checked = settings.animations;
  els.darkMode.checked = settings.darkMode === true;
}

function syncPlayerCountUI() {
  let n = Number(els.playerCount.value);
  n = Math.max(MIN_PLAYERS, Math.min(MAX_PLAYERS, n || 4));
  els.playerCount.value = String(n);
  els.playerCountOut.textContent = String(n);
  els.playerCountHint.textContent = `1 humano + ${n - 1} bots`;
}

function renderBotNameInputs() {
  const n = Number(els.playerCount.value) - 1;
  const existing = [...els.botNames.querySelectorAll('input')].map((i) => i.value);
  const defaults = settings.botNames?.length ? settings.botNames : defaultBotNames(n);
  els.botNames.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 16;
    input.value = existing[i] || defaults[i] || defaultBotNames(n)[i];
    input.setAttribute('aria-label', `Nombre del bot ${i + 1}`);
    els.botNames.appendChild(input);
  }
}

function readConfigFromForm() {
  const totalPlayers = Number(els.playerCount.value);
  const botNames = [...els.botNames.querySelectorAll('input')].map((i) => i.value.trim() || 'Bot');
  return {
    playerName: (els.playerName.value.trim() || 'Tú').slice(0, 16),
    totalPlayers,
    botNames,
    difficulty: els.difficulty.value,
    rules: {
      stacking: els.stacking.checked,
      playDrawnCard: true,
    },
    sound: els.sound.checked,
    animations: els.animations.checked,
    darkMode: els.darkMode.checked ? true : null,
    firstPlayer: 'human',
  };
}

function startGame() {
  const config = readConfigFromForm();
  if (config.totalPlayers < MIN_PLAYERS || config.totalPlayers > MAX_PLAYERS) return;
  if (!config.playerName) return;

  settings = { ...settings, ...config };
  persistAppSettings(settings);
  applyTheme(settings.darkMode);
  audio.setEnabled(settings.sound);
  document.body.classList.toggle('animations-on', shouldAnimate(settings.animations));

  controller?.destroy();
  let resultShown = false;

  controller = createController({
    onChange(state) {
      renderer.render(state, {
        onCardClick: (id) => onHumanCard(id),
        onDrawClick: () => controller?.humanDraw(),
      });
      if (state.status === 'finished' && !resultShown) {
        resultShown = true;
        const winner = state.players.find((p) => p.id === state.winner);
        const human = state.players.find((p) => p.isHuman);
        audio.play(winner?.isHuman ? 'win' : 'error');
        modals.showResult(
          {
            won: !!winner?.isHuman,
            winnerName: winner?.name || 'Rival',
            turns: state.stats.turnsPlayed,
            drawn: state.stats.cardsDrawn[human?.id] || 0,
          },
          {
            onAgain: () => {
              resultShown = false;
              controller?.restart();
            },
            onMenu: () => {
              controller?.abandon();
              renderer.render({ status: 'setup' });
            },
          },
        );
      }
    },
    onModal({ type, resolve }) {
      if (type === 'color') {
        modals.chooseColor().then(resolve);
      }
    },
    onAudio(event) {
      audio.play(event);
    },
  });

  controller.start(config);
}

async function onHumanCard(cardId) {
  const state = controller?.getState();
  if (!state) return;
  const human = state.players.find((p) => p.isHuman);
  const card = human?.hand.find((c) => c.id === cardId);
  if (!card) return;

  if (card.type === 'wild' || card.type === 'wild_draw4') {
    // Validar antes del modal
    if (!isPlayable(card, {
      topCard: state.topCard,
      activeColor: state.activeColor,
      pendingDraw: state.pendingDraw,
      pendingDrawType: state.pendingDrawType,
      rules: state.config.rules,
    })) {
      audio.play('error');
      return;
    }
    const color = await modals.chooseColor();
    await controller.humanPlay(cardId, color);
  } else {
    const result = await controller.humanPlay(cardId);
    if (result && result.ok === false) audio.play('error');
  }
}

function openPause() {
  modals.showPause(
    {
      sound: settings.sound,
      animations: settings.animations,
      darkMode: settings.darkMode === true,
    },
    {
      onApply(next) {
        settings.sound = next.sound;
        settings.animations = next.animations;
        settings.darkMode = next.darkMode ? true : false;
        persistAppSettings(settings);
        applyTheme(settings.darkMode);
        audio.setEnabled(settings.sound);
        document.body.classList.toggle('animations-on', shouldAnimate(settings.animations));
        // sync setup toggles
        els.sound.checked = settings.sound;
        els.animations.checked = settings.animations;
        els.darkMode.checked = settings.darkMode === true;
      },
      onRestart: () => controller?.restart(),
      onAbandon: () => {
        controller?.abandon();
        renderer.render({ status: 'setup' });
      },
    },
  );
}

init();
