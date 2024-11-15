import type { AtIdentifier } from '../types/atproto.js';

import { isValidDid } from './did.js';
import { isValidHandle } from './handle.js';

export const isValidAtIdentifier = (str: string): str is AtIdentifier => {
	return isValidDid(str) || isValidHandle(str);
};
