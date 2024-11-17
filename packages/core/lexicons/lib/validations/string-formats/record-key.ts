import type { At } from '../../index.js';
import { isValidRecordKey } from '../../syntax/record-key.js';

import { type ValidateContext, type ValidateResult } from '../base.js';
import { BaseStringSchema } from '../primitives/string.js';

export class RecordKeyStringSchema extends BaseStringSchema<At.RecordKey> {
	override readonly format = 'record-key';

	override func(value: unknown, context: ValidateContext): ValidateResult<At.RecordKey> {
		if (typeof value !== 'string' || !isValidRecordKey(value)) {
			return { ok: false, error: `${context.path} must be a valid record-key string` };
		}

		return true;
	}
}

const recordKeySingleton = new RecordKeyStringSchema();

/*#__NO_SIDE_EFFECTS__*/
export const recordKeyString = () => {
	return recordKeySingleton;
};
