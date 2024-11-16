import { isValidHandle } from '../../syntax/handle.js';

import { type ValidateContext, type ValidateResult } from '../base.js';
import { BaseStringSchema } from '../primitives/string.js';

export class HandleStringSchema extends BaseStringSchema {
	override readonly format = 'handle';

	override func(value: unknown, context: ValidateContext): ValidateResult<string> {
		if (typeof value !== 'string' || !isValidHandle(value)) {
			return { ok: false, error: `${context.path} must be a valid handle string` };
		}

		return true;
	}
}

const handleSingleton = new HandleStringSchema();

/*#__NO_SIDE_EFFECTS__*/
export const handleString = () => {
	return handleSingleton;
};
