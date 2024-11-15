export type Cid = string;
export type Did = `did:${string}`;

export type Nsid = string;
export type RecordKey = string;

export type Uri = `${string}://${string}`;
export type AtUri = `at://${string}`;

export type Handle = string;
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
