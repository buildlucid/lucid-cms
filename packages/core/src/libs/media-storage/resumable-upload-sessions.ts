import type { MediaStorageAdapterInstance } from "./types.js";

type MultipartUploadSessionAdapter = MediaStorageAdapterInstance & {
	getUploadPartUrls: NonNullable<
		MediaStorageAdapterInstance["getUploadPartUrls"]
	>;
	listUploadParts: NonNullable<MediaStorageAdapterInstance["listUploadParts"]>;
	completeUploadSession: NonNullable<
		MediaStorageAdapterInstance["completeUploadSession"]
	>;
};

/**
 * Checks whether the adapter implements the multipart-parts protocol.
 */
export const hasMultipartUploadSessions = (
	adapter: MediaStorageAdapterInstance,
): adapter is MultipartUploadSessionAdapter => {
	return Boolean(
		adapter.getUploadPartUrls &&
			adapter.listUploadParts &&
			adapter.completeUploadSession,
	);
};
