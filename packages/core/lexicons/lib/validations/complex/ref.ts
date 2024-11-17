import { Schema, type ValidateContext, type ValidateResult } from '../base.js';
import { formatLiteral } from '../utils.js';

import { type BaseObject, type ObjectSchema } from './object.js';
import type { BaseRecord, RecordSchema } from './record.js';

type ObjectOrRecordSchema<T extends BaseObject | BaseRecord> = T extends BaseObject
	? ObjectSchema<T>
	: T extends BaseRecord
		? RecordSchema<T>
		: never;

export class RefSchema<T extends BaseObject | BaseRecord> extends Schema<T> {
	override readonly name = 'ref';

	private _initializer: () => ObjectOrRecordSchema<T>;
	private _object?: ObjectOrRecordSchema<T>;

	constructor(initializer: () => ObjectOrRecordSchema<T>) {
		super();

		this._initializer = initializer;
	}

	get object(): ObjectOrRecordSchema<T> {
		return this._object ?? this._initializer();
	}

	override func(value: unknown, context: ValidateContext): ValidateResult<T> {
		return this.object.func(value, context) as ValidateResult<T>;
	}
}

/*#__NO_SIDE_EFFECTS__*/
export const ref = <T extends BaseObject | BaseRecord>(
	initializer: () => ObjectOrRecordSchema<T>,
): RefSchema<T> => {
	return new RefSchema(initializer);
};

export class UnionSchema<T extends BaseObject | BaseRecord> extends Schema<T> {
	override readonly name = 'union';

	readonly closed: boolean;

	private _initializer: () => ObjectOrRecordSchema<T>[];
	private _mapping?: Record<string, ObjectOrRecordSchema<T>>;

	constructor(initializer: () => ObjectOrRecordSchema<T>[], closed = false) {
		super();

		this._initializer = initializer;
		this.closed = closed;
	}

	get mapping(): Record<string, ObjectOrRecordSchema<T>> {
		let mapping = this._mapping;
		if (mapping === undefined) {
			mapping = this._mapping = {};

			for (const object of this._initializer()) {
				mapping[object.nsid as string] = object;
			}
		}

		return mapping;
	}

	override func(value: any, context: ValidateContext): ValidateResult<T> {
		if (typeof value === 'object' || value === null || typeof value.$type !== 'string') {
			return { ok: false, error: `${context.path} must be an object with $type field` };
		}

		const type = value.$type;
		const schema = this.mapping[type] as ObjectOrRecordSchema<T> | undefined;
		if (schema == null) {
			if (this.closed) {
				return { ok: false, error: `${context.path} has unknown type ${formatLiteral(type)}` };
			}

			return true;
		}

		return schema.func(value, context) as ValidateResult<T>;
	}
}

/*#__NO_SIDE_EFFECTS__*/
export const union = <S extends BaseObject[] = BaseObject[]>(
	initializer: () => { [K in keyof S]: ObjectOrRecordSchema<S[K]> },
	closed?: boolean,
): UnionSchema<S[number]> => {
	return new UnionSchema(initializer, closed) as any;
};
