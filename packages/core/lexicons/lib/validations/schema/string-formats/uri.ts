import { isValidUri } from '../../../syntax/uri.js';

import { type ValidateContext, type ValidateResult } from '../base.js';
import { BaseStringSchema } from '../primitives/string.js';

export class UriStringSchema extends BaseStringSchema {
	override readonly format = 'uri';

	override func(value: unknown, context: ValidateContext): ValidateResult<string> {
		if (typeof value !== 'string' || !isValidUri(value)) {
			return { ok: false, error: `${context.path} must be a valid uri string` };
		}

		return true;
	}
}

const uriSingleton = new UriStringSchema();

/*#__NO_SIDE_EFFECTS__*/
export const uriString = () => {
	return uriSingleton;
};
