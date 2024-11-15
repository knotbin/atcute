import { decode, encode } from '@atcute/base64';

import type { Bytes } from '../types/atproto.js';

export class BytesWrapper implements Bytes {
	constructor(public buf: Uint8Array) {}

	get $bytes(): string {
		return encode(this.buf);
	}

	toJSON(): Bytes {
		return { $bytes: this.$bytes };
	}
}

export const isBytes = (value: unknown): value is Bytes => {
	const val = value as any;

	return (
		val instanceof BytesWrapper || (val !== null && typeof val === 'object' && typeof val.$bytes === 'string')
	);
};

export const toBytes = (buf: Uint8Array): Bytes => {
	return new BytesWrapper(buf);
};

export const fromBytes = (bytes: Bytes): Uint8Array => {
	if (bytes instanceof BytesWrapper) {
		return bytes.buf;
	}

	return decode(bytes.$bytes);
};
