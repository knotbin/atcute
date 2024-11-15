import { formatLiteral } from '../../utils.js';
import { Schema, type ValidateContext, type ValidateResult } from '../base.js';

export type LiteralValue = string | number | boolean;

export class LiteralSchema<T extends LiteralValue> extends Schema<T> {
	override readonly name = 'literal';
	readonly value: T;

	constructor(value: T) {
		super();

		this.value = value;
	}

	override func(value: unknown, context: ValidateContext): ValidateResult<T> {
		if (value !== this.value) {
			return { ok: false, error: `${context.path} must be ${formatLiteral(this.value)}` };
		}

		return true;
	}
}

/*#__NO_SIDE_EFFECTS__*/
export const literal = <T extends LiteralValue>(value: T): LiteralSchema<T> => {
	return new LiteralSchema(value);
};
