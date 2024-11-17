import * as CID from '@atcute/cid';

import type { At } from '../../index.js';

import { type ValidateContext, type ValidateResult } from '../base.js';
import { BaseStringSchema } from '../primitives/string.js';

export class CidStringSchema extends BaseStringSchema<At.Cid> {
	override readonly format = 'did';

	override func(value: unknown, context: ValidateContext): ValidateResult<At.Cid> {
		if (typeof value !== 'string') {
			return { ok: false, error: `${context.path} must be a valid did string` };
		}

		try {
			CID.parse(value);
		} catch {
			return { ok: false, error: `can't decode cid in ${context.path}` };
		}

		return true;
	}
}

const cidSingleton = new CidStringSchema();

/*#__NO_SIDE_EFFECTS__*/
export const cidString = () => {
	return cidSingleton;
};
