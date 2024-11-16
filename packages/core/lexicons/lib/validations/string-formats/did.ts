import { isValidDid } from '../../syntax/did.js';

import { type ValidateContext, type ValidateResult } from '../base.js';
import { BaseStringSchema } from '../primitives/string.js';

export class DidStringSchema extends BaseStringSchema {
	override readonly format = 'did';

	override func(value: unknown, context: ValidateContext): ValidateResult<string> {
		if (typeof value !== 'string' || !isValidDid(value)) {
			return { ok: false, error: `${context.path} must be a valid did string` };
		}

		return true;
	}
}

const didSingleton = new DidStringSchema();

/*#__NO_SIDE_EFFECTS__*/
export const didString = () => {
	return didSingleton;
};
