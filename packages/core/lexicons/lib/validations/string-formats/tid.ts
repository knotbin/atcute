import type { At } from '../../index.js';
import { isValidTid } from '../../syntax/tid.js';

import { type ValidateContext, type ValidateResult } from '../base.js';
import { BaseStringSchema } from '../primitives/string.js';

export class TidStringSchema extends BaseStringSchema<At.Tid> {
	override readonly format = 'tid';

	override func(value: unknown, context: ValidateContext): ValidateResult<At.Tid> {
		if (typeof value !== 'string' || !isValidTid(value)) {
			return { ok: false, error: `${context.path} must be a valid tid string` };
		}

		return true;
	}
}

const tidSingleton = new TidStringSchema();

/*#__NO_SIDE_EFFECTS__*/
export const tidString = () => {
	return tidSingleton;
};
