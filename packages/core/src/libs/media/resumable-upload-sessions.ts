import type { MediaAdapterInstance } from "./types.js";

type ResumableUploadSessionAdapter = MediaAdapterInstance & {
	getUploadPartUrls: NonNullable<MediaAdapterInstance["getUploadPartUrls"]>;
	listUploadParts: NonNullable<MediaAdapterInstance["listUploadParts"]>;
	completeUploadSession: NonNullable<
		MediaAdapterInstance["completeUploadSession"]
	>;
};

/**
 *  Checks if the given media adapter has resumable upload sessions enabled.
 */
export const hasResumableUploadSessions = (
	adapter: MediaAdapterInstance,
): adapter is ResumableUploadSessionAdapter => {
	return Boolean(
		adapter.getUploadPartUrls &&
			adapter.listUploadParts &&
			adapter.completeUploadSession,
	);
};
