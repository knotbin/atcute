import { formatLiteral } from '../../utils.js';
import { Schema, type ValidateContext, type ValidateResult } from '../base.js';

export type LiteralValue = string | number | boolean;

export class LiteralEnumSchema<T extends LiteralValue = LiteralValue> extends Schema<T> {
	override readonly name = 'literal-enum';
	readonly values: T[];

	constructor(value: T[]) {
		super();

		this.values = value;
	}

	override func(value: unknown, context: ValidateContext): ValidateResult<T> {
		if (!this.values.includes(value as any)) {
			return {
				ok: false,
				error: `${context.path} must be one of ${this.values.map(formatLiteral).join(' | ')}'`,
			};
		}

		return true;
	}
}

/*#__NO_SIDE_EFFECTS__*/
export const literalEnum = <T extends LiteralValue>(value: T[]): LiteralEnumSchema<T> => {
	return new LiteralEnumSchema(value);
};
