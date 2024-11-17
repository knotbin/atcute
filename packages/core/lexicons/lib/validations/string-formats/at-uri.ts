import type { At } from '../../index.js';
import { isValidAtUri } from '../../syntax/at-uri.js';

import { type ValidateContext, type ValidateResult } from '../base.js';
import { BaseStringSchema } from '../primitives/string.js';

export class AtUriStringSchema extends BaseStringSchema<At.AtUri> {
	override readonly format = 'at-uri';

	override func(value: unknown, context: ValidateContext): ValidateResult<At.AtUri> {
		if (typeof value !== 'string' || !isValidAtUri(value)) {
			return { ok: false, error: `${context.path} must be a valid at-uri string` };
		}

		return true;
	}
}

const atUriSingleton = new AtUriStringSchema();

/*#__NO_SIDE_EFFECTS__*/
export const atUriString = () => {
	return atUriSingleton;
};
