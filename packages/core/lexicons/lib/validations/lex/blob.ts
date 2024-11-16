import * as CID from '@atcute/cid';

import type { Blob } from '../../types/atproto.js';
import { toCidLink } from '../../wrappers/cid-link.js';

import { Schema, type ValidateContext, type ValidateResult } from '../base.js';
import { pushPath } from '../utils.js';

import { cidLink } from './cid-link.js';

const Link = cidLink();

export class BlobSchema extends Schema<Blob> {
	override readonly name = 'blob';

	override func(value: any, context: ValidateContext): ValidateResult<Blob> {
		if (value !== null && typeof value === 'object') {
			if (value.$type === 'blob' && typeof value.mimeType === 'string' && typeof value.size === 'number') {
				const cidResult = Link.func(value.ref, { ...context, path: pushPath(context.path, 'ref') });

				if (cidResult === true) {
					return true;
				} else if (cidResult.ok) {
					return { ok: true, value: { ...value, ref: cidResult.value } };
				} else {
					return cidResult;
				}
			}

			if (typeof value.cid === 'string' && typeof value.mimeType === 'string') {
				// Fail if no coercion is asked, the blob interface is very different
				if (!context.coerce) {
					return { ok: false, error: `${context.path} uses legacy blobs` };
				}

				return {
					ok: true,
					value: {
						$type: 'blob',
						ref: toCidLink(CID.parse(value.cid)),
						mimeType: value.mimeType,
						size: -1,
					},
				};
			}
		}

		return { ok: false, error: `${context.path} must be a blob` };
	}
}

const blobSingleton = new BlobSchema();

/*#__NO_SIDE_EFFECTS__*/
export const blob = (): BlobSchema => {
	return blobSingleton;
};
