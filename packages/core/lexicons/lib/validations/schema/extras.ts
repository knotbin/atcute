import { Schema, type ValidateContext, type ValidateResult } from './base.js';

export class OptionalSchema<T> extends Schema<T | undefined> {
	override readonly name = 'optional';
	readonly wrapped: Schema<T>;

	constructor(wrapped: Schema<T>) {
		super();
		this.wrapped = wrapped;
	}

	override func(value: unknown, context: ValidateContext): ValidateResult<T | undefined> {
		if (value === undefined) {
			return true;
		}

		return this.wrapped.func(value, context);
	}
}

/*#__NO_SIDE_EFFECTS__*/
export const optional = <T>(wrapped: Schema<T>): OptionalSchema<T> => {
	return new OptionalSchema(wrapped);
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
