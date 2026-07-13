const CODE_TO_LANE = Object.freeze({
  ArrowLeft: 'left',
  ArrowDown: 'down',
  ArrowUp: 'up',
  ArrowRight: 'right',
  KeyD: 'left',
  KeyF: 'down',
  KeyJ: 'up',
  KeyK: 'right',
});

const INTERACTIVE_SELECTOR = 'button, input, select, textarea, a[href], [contenteditable="true"]';

export function laneForCode(code) {
  return CODE_TO_LANE[code] ?? null;
}

export class InputManager {
  constructor({ onLanePress, onLaneRelease, onPause, onRestart, onConfirm }) {
    this.callbacks = { onLanePress, onLaneRelease, onPause, onRestart, onConfirm };
    this.activeKeys = new Set();
    this.activePointers = new Map();
    this.controller = null;
  }

  attach(target = document, touchRoot = document) {
    this.destroy();
    this.controller = new AbortController();
    const { signal } = this.controller;

    target.addEventListener('keydown', (event) => this.handleKeyDown(event), { signal });
    target.addEventListener('keyup', (event) => this.handleKeyUp(event), { signal });

    touchRoot.querySelectorAll('[data-lane]').forEach((button) => {
      button.addEventListener('pointerdown', (event) => this.handlePointerDown(event, button), { signal });
      button.addEventListener('pointerup', (event) => this.handlePointerUp(event, button), { signal });
      button.addEventListener('pointercancel', (event) => this.handlePointerUp(event, button), { signal });
      button.addEventListener('lostpointercapture', (event) => this.handlePointerUp(event, button), { signal });
      button.addEventListener('contextmenu', (event) => event.preventDefault(), { signal });
    });
  }

  handleKeyDown(event) {
    const lane = laneForCode(event.code);
    const interactive = Boolean(event.target?.closest?.(INTERACTIVE_SELECTOR));

    if (event.repeat) {
      if (lane && !interactive) event.preventDefault();
      return;
    }

    if (event.code === 'Escape' || event.code === 'KeyP') {
      event.preventDefault();
      this.callbacks.onPause?.();
      return;
    }

    if (interactive) return;

    if (lane) {
      event.preventDefault();
      if (this.activeKeys.has(event.code)) return;
      this.activeKeys.add(event.code);
      this.callbacks.onLanePress?.(lane, 'keyboard');
      return;
    }

    if (event.code === 'KeyR') {
      this.callbacks.onRestart?.();
    } else if (event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault();
      this.callbacks.onConfirm?.();
    }
  }

  handleKeyUp(event) {
    const lane = laneForCode(event.code);
    if (!lane || !this.activeKeys.has(event.code)) return;
    event.preventDefault();
    this.activeKeys.delete(event.code);
    this.callbacks.onLaneRelease?.(lane, 'keyboard');
  }

  handlePointerDown(event, button) {
    event.preventDefault();
    const lane = button.dataset.lane;
    this.activePointers.set(event.pointerId, lane);
    button.classList.add('is-pressed');
    button.setPointerCapture?.(event.pointerId);
    this.callbacks.onLanePress?.(lane, 'pointer');
  }

  handlePointerUp(event, button) {
    if (!this.activePointers.has(event.pointerId)) return;
    event.preventDefault();
    const lane = this.activePointers.get(event.pointerId);
    this.activePointers.delete(event.pointerId);
    button.classList.remove('is-pressed');
    this.callbacks.onLaneRelease?.(lane, 'pointer');
  }

  clear() {
    this.activeKeys.clear();
    this.activePointers.clear();
  }

  destroy() {
    this.controller?.abort();
    this.controller = null;
    this.clear();
  }
}
