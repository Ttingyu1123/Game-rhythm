const TRANSITIONS = Object.freeze({
  menu: new Set(['loading']),
  loading: new Set(['countdown', 'menu']),
  countdown: new Set(['playing', 'menu']),
  playing: new Set(['paused', 'result', 'menu']),
  paused: new Set(['countdown', 'loading', 'menu']),
  result: new Set(['loading', 'menu']),
});

export class GameStateMachine {
  constructor(initial = 'menu') {
    if (!TRANSITIONS[initial]) throw new TypeError(`Unknown game state: ${initial}`);
    this.current = initial;
  }

  transition(next) {
    if (!TRANSITIONS[this.current]?.has(next)) {
      throw new Error(`Invalid game state transition: ${this.current} -> ${next}`);
    }
    this.current = next;
    return this.current;
  }
}
