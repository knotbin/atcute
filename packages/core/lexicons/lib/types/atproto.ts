export type Cid = string;
export type Did = `did:${string}:${string}`;

export type Nsid = `${string}.${string}.${string}`;
export type RecordKey = string;

export type Uri = `${string}:${string}`;
export type AtUri = `at://${string}`;

export type Handle = `${string}.${string}`;
export type AtIdentifier = Did | Handle;

export type Datetime = string;
export type Tid = string;
export type LanguageCode = string;

export interface CidLink {
	$link: Cid;
}

export interface Bytes {
	$bytes: string;
}

export interface Blob<T extends string = string> {
	$type: 'blob';
	mimeType: T;
	ref: CidLink;
	size: number;
}

type Prettify<T> = {
	[K in keyof T]: T[K];
} & {};

export type Union<T extends { $type?: string }> = T extends { $type?: infer V extends string }
	? Prettify<{ $type: V } & Omit<T, '$type'>>
	: never;
