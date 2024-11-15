export interface ValidatorContext {
	// Do not attempt coercion if `schema.is` method is used, as they won't be used.
	coerce: boolean;
	path: string;
}

export type ValidatorResult<T> = true | { ok: true; value: T } | { ok: false; error: string };
export type Validator<T> = (value: unknown, context: ValidatorContext) => ValidatorResult<T>;

export type Checker<I, O = I> = (value: I, context: ValidatorContext) => ValidatorResult<O>;
