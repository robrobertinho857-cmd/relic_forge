import { setContextEventEmitter } from '../../../../packages/utils-event-emitter/src/context';
import { eventEmitter, type EmitterEvent } from './eventEmitter';

export const setContext = () => {
	setContextEventEmitter<EmitterEvent>({ eventEmitter });
};
