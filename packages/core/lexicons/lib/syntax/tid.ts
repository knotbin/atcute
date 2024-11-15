import type { Tid } from '../types/atproto.js';

export const TID_RE = /^[234567abcdefghij][234567abcdefghijklmnopqrstuvwxyz]{12}$/;

export const isValidTid = (str: string): str is Tid => {
	return str.length === 13 && TID_RE.test(str);
};
