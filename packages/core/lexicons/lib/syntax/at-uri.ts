import type { AtUri } from '../types/atproto.js';

import { isValidAtIdentifier } from './at-identifier.js';
import { isValidNsid } from './nsid.js';
import { isValidRecordKey } from './record-key.js';

export const AT_URI_RE =
	/^at:\/\/([a-zA-Z0-9._:%-]{3,2048})(?:\/([a-zA-Z0-9-.]{5,317})(?:\/([a-zA-Z0-9_~.:-]{1,512}))?)?(?:#(\/[a-zA-Z0-9._~:@!$&%')(*+,;=\-[\]/\\]*))?$/;

export interface ParsedAtUri {
	repo: string;
	collection: string;
	rkey: string;
	fragment: string;
}

export const isValidAtUri = (str: string): str is AtUri => {
	if (str.length < 8 || str.length > 8192) {
		return false;
	}

	const match = AT_URI_RE.exec(str);
	if (match === null) {
		return false;
	}

	const repo = match[1];
	if (!isValidAtIdentifier(repo)) {
		return false;
	}

	const collection = match[2];
	if (collection !== undefined && !isValidNsid(collection)) {
		return false;
	}

	const rkey = match[3];
	if (rkey !== undefined && !isValidRecordKey(rkey)) {
		return false;
	}

	return true;
};

export const parseAtUri = (str: string): ParsedAtUri => {
	if (str.length < 8 || str.length > 8192) {
		throw new InvalidAtUriError(str);
	}

	const match = AT_URI_RE.exec(str);
	if (match === null) {
		throw new InvalidAtUriError(str);
	}

	const repo = match[1];
	const collection: string | undefined = match[2];
	const rkey: string | undefined = match[3];
	const fragment: string | undefined = match[4];

	if (!isValidAtIdentifier(repo)) {
		throw new InvalidAtUriError(str);
	}

	if (collection !== undefined && !isValidNsid(collection)) {
		throw new InvalidAtUriError(str);
	}

	if (rkey !== undefined && !isValidRecordKey(rkey)) {
		throw new InvalidAtUriError(str);
	}

	return {
		repo: repo,
		collection: collection ?? '',
		rkey: rkey ?? '',
		fragment: fragment ?? '',
	};
};

export class InvalidAtUriError extends Error {
	constructor(uri: string) {
		super(`invalid at-uri: ${uri}`);
	}
}
