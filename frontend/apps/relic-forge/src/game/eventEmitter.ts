import { createEventEmitter } from '../../../../packages/utils-event-emitter/src/createEventEmitter';
import type { EmitterEventHotKey } from 'components-shared';

export type EmitterEvent = EmitterEventHotKey;

export const { eventEmitter } = createEventEmitter<EmitterEvent>();
