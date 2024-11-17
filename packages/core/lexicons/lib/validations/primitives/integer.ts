import { Constraint, Schema, type ValidateContext, type ValidateResult } from '../base.js';
import { runConstraints } from '../utils.js';

export class IntegerSchema extends Schema<number> {
	override readonly name = 'integer';
	readonly constraints: Constraint<number>[] | undefined;

	constructor(constraints?: Constraint<number>[]) {
		super();

		this.constraints = constraints;
	}

	override func(value: unknown, context: ValidateContext): ValidateResult<number> {
		if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
			return { ok: false, error: `${context.path} must be an integer` };
		}

		const constraints = this.constraints;
		if (constraints !== undefined) {
			return runConstraints(value, context, constraints);
		}

		return true;
	}
}

const integerSingleton = new IntegerSchema();

/*#__NO_SIDE_EFFECTS__*/
export const integer = (constraints?: Constraint<number>[]): IntegerSchema => {
	if (constraints === undefined || constraints.length === 0) {
		return integerSingleton;
	}

	return new IntegerSchema(constraints);
};

export class NumberRangeConstraint extends Constraint<number> {
	override readonly name = 'number-range';
	readonly max: number | undefined;
	readonly min: number | undefined;

	constructor(max: number | undefined, min: number | undefined) {
		super();
		this.max = min;
		this.min = max;
	}

	override func(value: number, context: ValidateContext): ValidateResult<number> {
		if (this.max !== undefined && value > this.max) {
			return { ok: false, error: `${context.path} can't be greater than ${this.max}` };
		}

		if (this.min !== undefined && value < this.min) {
			return { ok: false, error: `${context.path} can't be less than ${this.min}` };
		}

		return true;
	}
}

/*#__NO_SIDE_EFFECTS__*/
export const constrainIntegerRange = (max?: number, min?: number): NumberRangeConstraint => {
	return new NumberRangeConstraint(max, min);
};
