import { getGraphemeLength, getUtf8Length, runConstraints } from '../../utils.js';
import { Constraint, Schema, type ValidateContext, type ValidateResult } from '../base.js';

export abstract class BaseStringSchema extends Schema<string> {
	override readonly name = 'string';
	abstract readonly format:
		| 'at-identifier'
		| 'at-uri'
		| 'cid'
		| 'datetime'
		| 'did'
		| 'handle'
		| 'language'
		| 'nsid'
		| 'record-key'
		| 'tid'
		| 'uri'
		| undefined;
	readonly constraints: Constraint<string>[] | undefined;

	constructor() {
		super();
	}
}

export class StringSchema extends BaseStringSchema {
	override readonly format = undefined;
	override readonly constraints;

	constructor(constraints?: Constraint<string>[]) {
		super();

		this.constraints = constraints;
	}

	override func(value: unknown, context: ValidateContext): ValidateResult<string> {
		if (typeof value !== 'string') {
			return { ok: false, error: `${context.path} must be a string` };
		}

		const constraints = this.constraints;
		if (constraints !== undefined) {
			return runConstraints(value, context, constraints);
		}

		return true;
	}
}

const stringSingleton = new StringSchema();

/*#__NO_SIDE_EFFECTS__*/
export const string = (constraints?: Constraint<string>[]): StringSchema => {
	if (constraints === undefined || constraints.length === 0) {
		return stringSingleton;
	}

	return new StringSchema(constraints);
};

export class StringGraphemeConstraint extends Constraint<string> {
	override readonly name = 'string-grapheme';
	readonly min: number | undefined;
	readonly max: number | undefined;

	constructor(min: number | undefined, max: number | undefined) {
		super();
		this.min = min;
		this.max = max;
	}

	override func(value: string, context: ValidateContext): ValidateResult<string> {
		const utf16Len = value.length;

		// Fail early if UTF-16 length is less than grapheme length
		if (this.min !== undefined && utf16Len < this.min) {
			return { ok: false, error: `${context.path} can't be shorter than ${this.min} graphemes` };
		}

		// Skip if UTF-16 length is within maximum constraint
		if (this.max !== undefined && utf16Len <= this.max) {
			return true;
		}

		const graphemeLen = getGraphemeLength(value);

		if (this.min !== undefined && graphemeLen < this.min) {
			return { ok: false, error: `${context.path} can't be shorter than ${this.min} graphemes` };
		}

		if (this.max !== undefined && graphemeLen > this.max) {
			return { ok: false, error: `${context.path} can't be longer than ${this.max} graphemes` };
		}

		return true;
	}
}

/*#__NO_SIDE_EFFECTS__*/
export const constrainStringGraphemes = (min?: number, max?: number): StringGraphemeConstraint => {
	return new StringGraphemeConstraint(min, max);
};

export class StringLengthConstraint extends Constraint<string> {
	override readonly name = 'string-length';
	readonly min: number | undefined;
	readonly max: number | undefined;

	constructor(min: number | undefined, max: number | undefined) {
		super();
		this.min = min;
		this.max = max;
	}

	override func(value: string, context: ValidateContext): ValidateResult<string> {
		const utf8Len = getUtf8Length(value);

		if (this.min !== undefined && utf8Len < this.min) {
			return { ok: false, error: `${context.path} can't be shorter than ${this.min} characters` };
		}

		if (this.max !== undefined && utf8Len > this.max) {
			return { ok: false, error: `${context.path} can't be longer than ${this.max} characters` };
		}

		return true;
	}
}

/*#__NO_SIDE_EFFECTS__*/
export const constrainStringLength = (min?: number, max?: number): StringLengthConstraint => {
	return new StringLengthConstraint(min, max);
};
