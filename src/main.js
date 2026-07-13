import './styles/main.css';
import { Game } from './core/Game.js';

const game = new Game(document);

window.addEventListener('pagehide', () => game.destroy(), { once: true });
