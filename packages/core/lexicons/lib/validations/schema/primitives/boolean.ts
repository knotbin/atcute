import { Schema, type ValidateContext, type ValidateResult } from '../base.js';

export class BooleanSchema extends Schema<boolean> {
	override readonly name = 'boolean';

	override func(value: unknown, context: ValidateContext): ValidateResult<boolean> {
		if (typeof value !== 'boolean') {
			return { ok: false, error: `${context.path} must be a boolean` };
		}

		return true;
	}
}

const booleanSingleton = new BooleanSchema();

/*#__NO_SIDE_EFFECTS__*/
export const boolean = (): BooleanSchema => {
	return booleanSingleton;
};
