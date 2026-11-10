import type { ResolvedLucidConfig } from "../../types/config.js";
import { LucidError } from "../../utils/errors/index.js";
import runHandler from "../../utils/services/run-handler.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../utils/services/types.js";
import type {
	MediaStorageAdapterInstance,
	ResolvedMediaStorageAdapter,
} from "./types.js";

/** Wraps one adapter operation so a throw becomes a service result. */
const toResult =
	<Params, Result>(
		operation: (context: ServiceContext, params: Params) => Promise<Result>,
	) =>
	(context: ServiceContext, params: Params): ServiceResponse<Result> =>
		runHandler(() => operation(context, params));

/** Wraps adapter operations as service results, preserving `this` for class adapters. */
export const resolveMediaStorageAdapter = (
	adapter: MediaStorageAdapterInstance,
): ResolvedMediaStorageAdapter => ({
	...adapter,
	createUploadSession: toResult(adapter.createUploadSession.bind(adapter)),
	getUploadPartUrls:
		adapter.getUploadPartUrls &&
		toResult(adapter.getUploadPartUrls.bind(adapter)),
	listUploadParts:
		adapter.listUploadParts && toResult(adapter.listUploadParts.bind(adapter)),
	completeUploadSession:
		adapter.completeUploadSession &&
		toResult(adapter.completeUploadSession.bind(adapter)),
	abortUploadSession:
		adapter.abortUploadSession &&
		toResult(adapter.abortUploadSession.bind(adapter)),
	getDownloadUrl: toResult(adapter.getDownloadUrl.bind(adapter)),
	getMeta: toResult(adapter.getMeta.bind(adapter)),
	stream: toResult(adapter.stream.bind(adapter)),
	upload: toResult(adapter.upload.bind(adapter)),
	delete: toResult(adapter.delete.bind(adapter)),
	deleteMultiple: toResult(adapter.deleteMultiple.bind(adapter)),
	rename: toResult(adapter.rename.bind(adapter)),
});

/** Resolves the configured media storage adapter for services, returning null when omitted. */
const getMediaStorageAdapter = async (config: {
	media: Pick<ResolvedLucidConfig["media"], "storageAdapter">;
}): Promise<ResolvedMediaStorageAdapter | null> => {
	if (!config.media.storageAdapter) return null;

	try {
		return resolveMediaStorageAdapter(
			await (typeof config.media.storageAdapter === "function"
				? config.media.storageAdapter()
				: config.media.storageAdapter),
		);
	} catch (error) {
		if (error instanceof LucidError) throw error;
		throw new LucidError({
			message: "The configured media storage adapter could not be initialized.",
			data: {
				errorMessage: error instanceof Error ? error.message : String(error),
			},
		});
	}
};

export default getMediaStorageAdapter;
