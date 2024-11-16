export interface ValidateContext {
	// Do not attempt coercion if `schema.is` method is used, as they won't be used.
	coerce: boolean;
	path: string;
}

export type ValidateResult<T> = true | { ok: true; value: T } | { ok: false; error: string };

export class ValidationError extends Error {}
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

export abstract class Constraint<T> {
	abstract readonly name: string;
	abstract func(value: T, context: ValidateContext): ValidateResult<T>;
}

export abstract class Schema<T> {
	abstract readonly name: string;
	abstract func(value: unknown, context: ValidateContext): ValidateResult<T>;

	parse(value: unknown): T {
		const result = this.func(value, { path: '<root>', coerce: false });

		if (result === true) {
			return value as T;
		} else if (result.ok) {
			return result.value as T;
		} else {
			throw new ValidationError(result.error);
		}
	}

	try(value: unknown): ValidationResult<T> {
		const result = this.func(value, { path: '<root>', coerce: false });

		if (result === true) {
			return { ok: true, value: value as T };
		} else {
			// do a `satisfies any` check first so we can be sure that `result`
			// actually matches the final shape
			return result satisfies ValidationResult<any> as ValidationResult<T>;
		}
	}

	is(value: unknown): value is T {
		const result = this.func(value, { path: '<root>', coerce: true });

		return result === true || result.ok;
	}
}
