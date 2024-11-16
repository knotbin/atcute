import { Schema, type ValidateContext, type ValidateResult } from '../base.js';
import { pushPath } from '../utils.js';

export interface ArraySchemaOptions {
	minLength?: number;
	maxLength?: number;
}

export class ArraySchema<T> extends Schema<T[]> {
	override readonly name = 'array';

	readonly shape: Schema<T>;
	readonly minLength: number | undefined;
	readonly maxLength: number | undefined;

	constructor(shape: Schema<T>, options?: ArraySchemaOptions) {
		super();

		this.shape = shape;
		this.minLength = options?.minLength;
		this.maxLength = options?.maxLength;
	}

	override func(value: unknown, context: ValidateContext): ValidateResult<T[]> {
		if (!Array.isArray(value)) {
			return { ok: false, error: `${context.path} must be array` };
		}

		const length = value.length;
		if (this.minLength !== undefined && length < this.minLength) {
			return { ok: false, error: `${context.path} can't contain less than ${this.minLength} items` };
		}
		if (this.maxLength !== undefined && length > this.maxLength) {
			return { ok: false, error: `${context.path} can't contain more than ${this.maxLength} items` };
		}

		const shape = this.shape;
		const coerce = context.coerce;

		let values: any[] | undefined;

		for (let idx = 0; idx < length; idx++) {
			const item = value[idx];

			const result = shape.func(item, { ...context, path: pushPath(context.path, '' + idx) });

			if (result === true) {
				// continue
			} else if (result.ok) {
				if (coerce) {
					if (!values) {
						values = value.with(idx, result.value);
					} else {
						values[idx] = result.value;
					}
				}
			} else {
				return result;
			}
		}

		if (values) {
			return { ok: true, value: values };
		}

		return true;
	}
}

/*#__NO_SIDE_EFFECTS__*/
export const array = <T>(shape: Schema<T>, options?: ArraySchemaOptions): ArraySchema<T> => {
	return new ArraySchema(shape, options);
};
