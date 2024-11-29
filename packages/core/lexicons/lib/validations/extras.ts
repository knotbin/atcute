import { Schema, type ValidateContext, type ValidateResult } from './base.js';

export class OptionalSchema<T> extends Schema<T | undefined> {
	override readonly name = 'optional';
	readonly wrapped: Schema<T>;
	readonly defaultValue: T | undefined;

	constructor(wrapped: Schema<T>, defaultValue: T | undefined) {
		super();
		this.wrapped = wrapped;
		this.defaultValue = defaultValue;
	}

	override func(value: unknown, context: ValidateContext): ValidateResult<T | undefined> {
		if (value === undefined) {
			const defaultValue = this.defaultValue;
			if (defaultValue !== undefined) {
				return { ok: true, value: defaultValue };
			}

			return true;
		}

		return this.wrapped.func(value, context);
	}
}

/*#__NO_SIDE_EFFECTS__*/
export const optional = <T>(wrapped: Schema<T>, defaultValue?: T): OptionalSchema<T> => {
	return new OptionalSchema(wrapped, defaultValue);
};

export class NullableSchema<T> extends Schema<T | undefined> {
	override readonly name = 'nullable';
	readonly wrapped: Schema<T>;

	constructor(wrapped: Schema<T>) {
		super();
		this.wrapped = wrapped;
	}

	override func(value: unknown, context: ValidateContext): ValidateResult<T | undefined> {
		if (value === null) {
			return true;
		}

		return this.wrapped.func(value, context);
	}
}

/*#__NO_SIDE_EFFECTS__*/
export const nullable = <T>(wrapped: Schema<T>): NullableSchema<T> => {
	return new NullableSchema(wrapped);
};
