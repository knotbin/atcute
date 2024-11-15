import type { Constraint, ValidateContext, ValidateResult } from './schema/base.js';

const segmenter = new Intl.Segmenter();

export const getUtf8Length = (str: string): number => {
	const len = str.length;

	let u16pos = 0;
	let u8pos = 0;

	while (u16pos < len) {
		const code = str.charCodeAt(u16pos);

		if (code < 0x80) {
			u16pos += 1;
			u8pos += 1;
		} else if (code < 0x800) {
			u16pos += 1;
			u8pos += 2;
		} else if (code < 0xd800 || code > 0xdbff) {
			u16pos += 1;
			u8pos += 3;
		} else {
			u16pos += 2;
			u8pos += 4;
		}
	}

	return u8pos;
};

export const getGraphemeLength = (text: string): number => {
	var iterator = segmenter.segment(text)[Symbol.iterator]();
	var count = 0;

	while (!iterator.next().done) {
		count++;
	}

	return count;
};

export const pushPath = (a: string, b: string): string => {
	return (a !== '<root>' ? a + '/' : '') + b;
};

export const formatLiteral = (value: string | number | boolean): string => {
	if (typeof value === 'string') {
		return `'${value}'`;
	}

	return '' + value;
};

export const runConstraints = <T>(
	value: T,
	context: ValidateContext,
	constraints: Constraint<T>[],
): ValidateResult<T> => {
	let coercedValue = value;
	let coerced = false;

	for (let idx = 0, len = constraints.length; idx < len; idx++) {
		const constraint = constraints[idx];
		const result = constraint.func(coercedValue, context);

		if (result === true) {
			// do nothing
		} else if (result.ok) {
			coerced = true;
			coercedValue = result.value;
		} else {
			return result;
		}
	}

	if (coerced) {
		return { ok: true, value: coercedValue };
	}

	return true;
};
