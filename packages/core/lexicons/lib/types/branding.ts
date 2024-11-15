declare const Type: unique symbol;

/** Get the intended `$type` field */
type GetType<T extends { [Type]?: string }> = NonNullable<T[typeof Type]>;

/** Creates a union of objects where it's discriminated by `$type` field. */
type _Union<T extends { [Type]?: string }> = T extends any ? T & { $type: GetType<T> } : never;

/** Omits the type branding from object */
type _Omit<T extends { [Type]?: string }> = Omit<T, typeof Type>;

export type { Type, GetType, _Union as Union, _Omit as Omit };
