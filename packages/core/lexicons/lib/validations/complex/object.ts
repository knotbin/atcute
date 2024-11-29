import { Schema, type ValidateContext, type ValidateResult } from '../base.js';
import { pushPath } from '../utils.js';

export interface BaseObject {
	$type?: string;
}

export type NsidOf<O> = O extends { $type?: infer V extends string } ? V : null;

interface ObjectShape {
	[key: string]: Schema<unknown>;
}

export class ObjectSchema<T = BaseObject> extends Schema<T> {
	override readonly name = 'object';

	readonly nsid: NsidOf<T>;
	readonly shape: ObjectShape;

	constructor(nsid: NsidOf<T>, properties: ObjectShape) {
		super();

		this.nsid = nsid;
		this.shape = properties;
	}

	override func(value: unknown, context: ValidateContext): ValidateResult<T> {
		if (typeof value !== 'object' || value === null) {
			return { ok: false, error: `${context.path} must be an object` };
		}

		const shape = this.shape;
		const coerce = context.coerce;

		let values: Record<string, any> | undefined;

		for (const key in shape) {
			const val = (value as any)[key];
			const schema = shape[key];

			const result = schema.func(val, { ...context, path: pushPath(context.path, key) });

			if (result === true) {
				// continue
			} else if (result.ok) {
				if (coerce) {
					if (!values) {
						values = { ...(value as any), [key]: result.value };
					} else {
						values[key] = result.value;
					}
				}
			} else {
				return result;
			}
		}

		if (values !== undefined) {
			return { ok: true, value: values as T };
		}

		return true;
	}
}

/*#__NO_SIDE_EFFECTS__*/
export const object = <T>(nsid: NsidOf<T>, properties: ObjectShape): ObjectSchema<T> => {
	return new ObjectSchema(nsid, properties);
};
