import type { RecordKey } from '../types/atproto.js';

export const RECORD_KEY_RE = /^(?!\.{1,2}$)[a-zA-Z0-9_~.:-]{1,512}$/;

export const isValidRecordKey = (str: string): str is RecordKey => {
	return str.length >= 1 && str.length <= 512 && RECORD_KEY_RE.test(str);
};
