import { LucidError } from "@lucidcms/core";
import type { DocumentChangeMetadata, LucidHook } from "@lucidcms/core/types";
import type { SendIndexNowJob } from "../../jobs/send-index-now.js";
import resolveListedVersion from "../index-now/resolve-listed-version.js";
import type { SeoPluginOptionsInternal } from "../parse-plugin-options.js";

/** The version a change wrote to or removed from, or null for changes that aren't to one version. */
const changedVersion = (change: DocumentChangeMetadata): string | null => {
	switch (change.type) {
		case "created":
			return "latest";
		case "updated":
			return change.version ?? "latest";
		case "published":
		case "unpublished":
			return change.version;
		default:
			return null;
	}
};

/**
 * Queues sends for sitemap-version publishes, unpublishes and latest saves, plus all deletes and
 * restores. Used without deploy gating, when published content is immediately live.
 */
const indexNowChangeHandler =
	(
		options: SeoPluginOptionsInternal,
		job: SendIndexNowJob,
	): LucidHook<"documents", "afterChange">["handler"] =>
	async ({ meta, data, context, toolkit }) => {
		if (!data.change) return;
		const listed = resolveListedVersion(
			context.config,
			options,
			meta.collectionKey,
		);
		if (listed === null) return;
		if (
			data.change.type !== "deleted" &&
			data.change.type !== "restored" &&
			changedVersion(data.change) !== listed
		) {
			return;
		}

		const queued = await toolkit.jobs.enqueueJob({ job, payload: null });
		if (queued.error) throw new LucidError(queued.error);
	};

export default indexNowChangeHandler;
