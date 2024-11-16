import { isValidAtIdentifier } from '../../syntax/at-identifier.js';

import { type ValidateContext, type ValidateResult } from '../base.js';
import { BaseStringSchema } from '../primitives/string.js';

export class AtIdentifierStringSchema extends BaseStringSchema {
	override readonly format = 'at-identifier';

	override func(value: unknown, context: ValidateContext): ValidateResult<string> {
		if (typeof value !== 'string' || !isValidAtIdentifier(value)) {
			return { ok: false, error: `${context.path} must be a valid did or handle string` };
		}

		return true;
	}
}

const atIdentifierSingleton = new AtIdentifierStringSchema();

/*#__NO_SIDE_EFFECTS__*/
export const atIdentifierString = () => {
	return atIdentifierSingleton;
};
