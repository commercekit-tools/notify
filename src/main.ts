import { runAction } from './action.js';
runAction().catch(() => (process.exitCode = 1));
