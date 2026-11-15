import { runAction } from './action.js';
import * as core from '@actions/core';
runAction().catch(() => {
  core.setFailed('Notification action failed unexpectedly.');
});
