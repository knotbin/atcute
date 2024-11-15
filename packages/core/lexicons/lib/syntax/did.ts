import type { Did } from '../types/atproto.js';

export const DID_RE = /^did:([a-z]+):([a-zA-Z0-9._:%-]*[a-zA-Z0-9._-])$/;

export const isValidDid = (str: string): str is Did => {
	return str.length >= 7 && str.length <= 2048 && DID_RE.test(str);
};
