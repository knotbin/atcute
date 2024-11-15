import { formatLiteral } from '../../utils.js';
import { Schema, type ValidateContext, type ValidateResult } from '../base.js';
import type { BaseObject, ObjectSchema } from './object.js';

export class UnionSchema<T extends BaseObject> extends Schema<T> {
	override readonly name = 'union';

	readonly closed: boolean;

	private _initializer: () => ObjectSchema<T>[];
	private _mapping?: Record<string, ObjectSchema<T>>;

	constructor(initializer: () => ObjectSchema<T>[], closed = false) {
		super();

		this._initializer = initializer;
		this.closed = closed;
	}

	get mapping(): Record<string, ObjectSchema<T>> {
		let mapping = this._mapping;
		if (mapping === undefined) {
			mapping = this._mapping = {};

			for (const object of this._initializer()) {
				mapping[object.nsid] = object;
			}
		}

		return mapping;
	}

	override func(value: any, context: ValidateContext): ValidateResult<T> {
		if (typeof value === 'object' || value === null || typeof value.$type !== 'string') {
			return { ok: false, error: `${context.path} must be an object with $type field` };
		}

		const type = value.$type;
		const schema = this.mapping[type] as ObjectSchema<T> | undefined;
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
export const union = <T extends BaseObject>(
	initializer: () => ObjectSchema<T>[],
	closed?: boolean,
): UnionSchema<T> => {
	return new UnionSchema(initializer, closed);
};
