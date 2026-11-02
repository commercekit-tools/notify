import { readFile } from 'node:fs/promises';
const schema = JSON.parse(
  await readFile(new URL('../schema/notification-event-v1.schema.json', import.meta.url), 'utf8'),
);
if (schema.$schema !== 'https://json-schema.org/draft/2020-12/schema' || schema.properties.schemaVersion.const !== 1)
  throw new Error('NotificationEvent schema metadata is invalid.');
console.log('NotificationEvent v1 schema metadata is valid.');
