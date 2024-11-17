import type { At } from '../../index.js';
import { isValidNsid } from '../../syntax/nsid.js';

import { type ValidateContext, type ValidateResult } from '../base.js';
import { BaseStringSchema } from '../primitives/string.js';

export class NsidStringSchema extends BaseStringSchema<At.Nsid> {
	override readonly format = 'nsid';

	override func(value: unknown, context: ValidateContext): ValidateResult<At.Nsid> {
		if (typeof value !== 'string' || !isValidNsid(value)) {
			return { ok: false, error: `${context.path} must be a valid nsid string` };
		}

		return true;
	}
}

const nsidSingleton = new NsidStringSchema();

/*#__NO_SIDE_EFFECTS__*/
export const nsidString = () => {
	return nsidSingleton;
};
