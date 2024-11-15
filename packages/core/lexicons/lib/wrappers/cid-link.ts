import * as base32 from '@atcute/base32';
import { type CID, parse } from '@atcute/cid';

import type { CidLink } from '../types/atproto.js';

export class CidLinkWrapper implements CidLink {
	constructor(public cid: CID) {}

	get $link(): string {
		return 'b' + base32.encode(this.cid.bytes);
	}

	toJSON(): CidLink {
		return { $link: this.$link };
	}
}

export const isCidLink = (value: unknown): value is CidLink => {
	const val = value as any;

	return (
		val instanceof CidLinkWrapper ||
		(val !== null && typeof val === 'object' && typeof val.$link === 'string')
	);
};

export const toCidLink = (value: CID): CidLink => {
	return new CidLinkWrapper(value);
};

export const fromCidLink = (link: CidLink): CID => {
	if (link instanceof CidLinkWrapper) {
		return link.cid;
	}

	return parse(link.$link);
};
