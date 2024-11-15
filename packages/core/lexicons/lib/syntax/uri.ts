import type { Uri } from '../types/atproto.js';

export const URI_RE = /^\w+:(?:\/\/)?[^\s/][^\s]*$/;

export const isValidUri = (str: string): str is Uri => {
	return str.length >= 3 && URI_RE.test(str);
};
