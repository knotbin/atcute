import * as base64 from '@atcute/base64';

import type { Bytes } from '../../types/atproto.js';
import { BytesWrapper, fromBytes } from '../../wrappers/bytes.js';

import { Constraint, Schema, type ValidateContext, type ValidateResult } from '../base.js';
import { runConstraints } from '../utils.js';

export class BytesSchema extends Schema<Bytes> {
	override readonly name = 'bytes';
	readonly constraints: Constraint<Bytes>[] | undefined;

	constructor(constraints?: Constraint<Bytes>[]) {
		super();
		this.constraints = constraints;
	}

	override func(value: any, context: ValidateContext): ValidateResult<Bytes> {
		if (value instanceof BytesWrapper) {
			const constraints = this.constraints;
			if (constraints !== undefined) {
				return runConstraints<Bytes>(value, context, constraints);
			}

			return true;
		}

		if (value === null || typeof value !== 'object' || typeof value.$bytes !== 'string') {
			return { ok: false, error: `${context.path} must be a byte array` };
		}

		try {
			const bytes = new BytesWrapper(base64.decode(value.$link));
			const constraints = this.constraints;

			if (constraints !== undefined) {
				const result = runConstraints<Bytes>(value, context, constraints);
				if (result !== true) {
					return result;
				}
			}

			if (context.coerce) {
				return { ok: true, value: bytes };
			}

			return true;
		} catch {
			return { ok: false, error: `${context.path} can't be decoded` };
		}
	}
}

const bytesSingleton = new BytesSchema();

/*#__NO_SIDE_EFFECTS__*/
export const bytes = (constraints?: Constraint<Bytes>[]): BytesSchema => {
	if (constraints === undefined || constraints.length === 0) {
		return bytesSingleton;
	}

	return new BytesSchema(constraints);
};

export class BytesSizeConstraint extends Constraint<Bytes> {
	override readonly name = 'bytes-size';
	readonly min: number | undefined;
	readonly max: number | undefined;

	constructor(min: number | undefined, max: number | undefined) {
		super();
		this.min = min;
		this.max = max;
	}

	override func(value: Bytes, context: ValidateContext): ValidateResult<Bytes> {
		const buffer = fromBytes(value);
		const byteLength = buffer.byteLength;

		if (this.min !== undefined && byteLength < this.min) {
			return { ok: false, error: `${context.path} can't be less than ${this.min} bytes` };
		}

		if (this.max !== undefined && byteLength > this.max) {
			return { ok: false, error: `${context.path} can't be greater than ${this.max} bytes` };
		}

		return true;
	}
}

/*#__NO_SIDE_EFFECTS__*/
export const constrainBytesSize = (min?: number, max?: number): BytesSizeConstraint => {
	return new BytesSizeConstraint(min, max);
};
