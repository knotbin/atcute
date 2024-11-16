import * as CID from '@atcute/cid';

import type { CidLink } from '../../types/atproto.js';
import { CidLinkWrapper } from '../../wrappers/cid-link.js';

import { Schema, type ValidateContext, type ValidateResult } from '../base.js';

export class CidLinkSchema extends Schema<CidLink> {
	override readonly name = 'blob';

	override func(value: any, context: ValidateContext): ValidateResult<CidLink> {
		if (value instanceof CidLinkWrapper) {
			return true;
		}

		if (value === null || typeof value !== 'object' || typeof value.$link !== 'string') {
			return { ok: false, error: `${context.path} must be a cid-link` };
		}

		try {
			const result = CID.parse(value.$link);
			if (context.coerce) {
				return { ok: true, value: new CidLinkWrapper(result) };
			}

			return true;
		} catch {
			return { ok: false, error: `${context.path} can't be decoded` };
		}
	}
}

const cidLinkSingleton = new CidLinkSchema();

/*#__NO_SIDE_EFFECTS__*/
export const cidLink = (): CidLinkSchema => {
	return cidLinkSingleton;
};
