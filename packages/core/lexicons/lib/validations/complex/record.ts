import { Schema, type ValidateContext, type ValidateResult } from '../base.js';

import type { ObjectSchema } from './object.js';
import type { BaseStringSchema } from '../primitives/string.js';

export interface BaseRecord {
	$type: string;
}

export class RecordSchema<T extends BaseRecord> extends Schema<T> {
	override readonly name = 'record';

	readonly nsid: T['$type'];
	readonly key: BaseStringSchema;
	readonly object: ObjectSchema<T>;

	constructor(nsid: T['$type'], key: BaseStringSchema, object: ObjectSchema<T>) {
		super();

		this.nsid = nsid;
		this.key = key;
		this.object = object;
	}

	override func(value: unknown, context: ValidateContext): ValidateResult<T> {
		return this.object.func(value, context);
	}
}

/*#__NO_SIDE_EFFECTS__*/
export const record = <T extends BaseRecord>(
	nsid: T['$type'],
	key: BaseStringSchema,
	object: ObjectSchema<T>,
): RecordSchema<T> => {
	return new RecordSchema<T>(nsid, key, object);
};
