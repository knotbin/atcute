export interface JsonResponse<T> {
	type?: 'json';
	value: T;
}

export interface BytesResponse {
	type: 'bytes';
	value: Uint8Array;
}

export interface BlobResponse {
	type: 'blob';
	value: Blob;
}
