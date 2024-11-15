import type { Nsid } from '../types/atproto.js';

export const NSID_RE =
	/^[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(\.[a-zA-Z]([a-zA-Z]{0,61}[a-zA-Z])?)$/;

export const isValidNsid = (str: string): str is Nsid => {
	return str.length >= 5 && str.length <= 317 && NSID_RE.test(str);
};
