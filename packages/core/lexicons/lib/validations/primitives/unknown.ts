import { Schema, type ValidateContext, type ValidateResult } from '../base.js';

export class UnknownSchema extends Schema<Record<PropertyKey, unknown>> {
	override readonly name = 'unknown';

	override func(value: unknown, context: ValidateContext): ValidateResult<Record<PropertyKey, unknown>> {
		if (value === null || typeof value !== 'object') {
			return { ok: false, error: `${context.path} must be an object` };
		}

		return true;
	}
}

const unknownSingleton = new UnknownSchema();

/*#__NO_SIDE_EFFECTS__*/
export const unknown = (): UnknownSchema => {
	return unknownSingleton;
};
