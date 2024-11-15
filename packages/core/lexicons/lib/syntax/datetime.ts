import type { Datetime } from '../types/atproto.js';

// Has to match an intersection of RFC 3339, ISO 8601, and WHATWG HTML datetime standards
//
// Date: (?!0{3})\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])
// Time: (?:[01]\d|2[0-3]):(?:[0-5]\d):(?:[0-5]\d)(\.\d+)?
// TZ:   Z|(?!-00:00)[+-](?:[01]\d|2[0-3]):(?:[0-5]\d)

export const DATE_TIME_RE =
	/^((?!0{3})\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01]))T((?:[01]\d|2[0-3]):(?:[0-5]\d):(?:[0-5]\d))(\.\d+)?(Z|(?!-00:00)[+-](?:[01]\d|2[0-3]):(?:[0-5]\d))$/;

export const isValidDatetime = (str: string): str is Datetime => {
	return str.length >= 20 && str.length <= 64 && DATE_TIME_RE.test(str);
};
