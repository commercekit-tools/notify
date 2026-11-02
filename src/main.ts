import { runAction } from './action.js';
import * as core from '@actions/core';
runAction().catch(() => {
  core.setOutput('delivered', 'false');
  core.setOutput('provider', '');
  core.setOutput('event-type', '');
  core.setOutput('status', '');
  core.setOutput('attempts', '0');
  core.setFailed('Notification action failed unexpectedly.');
});
