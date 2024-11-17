import type { At } from '../../index.js';
import { isValidDatetime } from '../../syntax/datetime.js';

import { type ValidateContext, type ValidateResult } from '../base.js';
import { BaseStringSchema } from '../primitives/string.js';

export class DatetimeStringSchema extends BaseStringSchema<At.Datetime> {
	override readonly format = 'datetime';

	override func(value: unknown, context: ValidateContext): ValidateResult<At.Datetime> {
		if (typeof value !== 'string' || !isValidDatetime(value)) {
			return { ok: false, error: `${context.path} must be a valid datetime string` };
		}

		return true;
	}
}

const datetimeSingleton = new DatetimeStringSchema();

/*#__NO_SIDE_EFFECTS__*/
export const datetimeString = () => {
	return datetimeSingleton;
};
