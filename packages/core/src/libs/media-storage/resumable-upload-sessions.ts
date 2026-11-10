import type { ResolvedMediaStorageAdapter } from "./types.js";

type MultipartUploadSessionAdapter = ResolvedMediaStorageAdapter & {
	getUploadPartUrls: NonNullable<
		ResolvedMediaStorageAdapter["getUploadPartUrls"]
	>;
	listUploadParts: NonNullable<ResolvedMediaStorageAdapter["listUploadParts"]>;
	completeUploadSession: NonNullable<
		ResolvedMediaStorageAdapter["completeUploadSession"]
	>;
};

/**
 * Checks whether the adapter implements the multipart-parts protocol.
 */
export const hasMultipartUploadSessions = (
	adapter: ResolvedMediaStorageAdapter,
): adapter is MultipartUploadSessionAdapter => {
	return Boolean(
		adapter.getUploadPartUrls &&
		adapter.listUploadParts &&
		adapter.completeUploadSession,
	);
};
