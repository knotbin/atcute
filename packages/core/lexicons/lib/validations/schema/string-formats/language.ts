import { isValidLanguageCode } from '../../../syntax/language.js';

import { type ValidateContext, type ValidateResult } from '../base.js';
import { BaseStringSchema } from '../primitives/string.js';

export class LanguageStringSchema extends BaseStringSchema {
	override readonly format = 'language';

	override func(value: unknown, context: ValidateContext): ValidateResult<string> {
		if (typeof value !== 'string' || !isValidLanguageCode(value)) {
			return { ok: false, error: `${context.path} must be a valid language code string` };
		}

		return true;
	}
}

const languageSingleton = new LanguageStringSchema();

/*#__NO_SIDE_EFFECTS__*/
export const languageString = () => {
	return languageSingleton;
};
