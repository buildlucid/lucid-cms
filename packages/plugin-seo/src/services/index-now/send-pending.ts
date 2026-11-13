import { copy, logger } from "@lucidcms/core";
import type { ServiceFn } from "@lucidcms/core/types";
import { indexNow, PLUGIN_KEY } from "../../constants.js";
import type { SeoIndexNowOptionsInternal } from "../parse-plugin-options.js";
import buildBatches from "./build-batches.js";
import clearSent from "./clear-sent.js";
import getPendingUrls from "./get-pending-urls.js";
import recordSend from "./record-send.js";
import submitBatch from "./submit-batch.js";

/**
 * Sends pending URLs up to `revision` in per-origin batches without holding a transaction. Clears
 * accepted batches; logs rejected batches and skips their origin, leaving them pending. Rate
 * limits, server and network errors stop the send for retry. Records accepted counts and finish
 * time. Concurrent duplicate sends are harmless.
 */
const sendPending: ServiceFn<
	[{ indexNow: SeoIndexNowOptionsInternal; revision: number }],
	{ urlCount: number }
> = async (context, data) => {
	const rejected = new Set<string>();
	let urlCount = 0;
	let retry: { host: string; reason: string } | null = null;
	let after = 0;

	pages: while (true) {
		const pageRes = await getPendingUrls(context, {
			revision: data.revision,
			after,
			limit: indexNow.batchSize,
		});
		if (pageRes.error) return pageRes;
		const rows = pageRes.data;
		const last = rows.at(-1);
		if (!last) break;
		after = last.id;

		for (const batch of buildBatches(rows.map((row) => row.url))) {
			if (rejected.has(batch.origin)) continue;

			const result = await submitBatch({
				endpoint: data.indexNow.endpoint,
				key: data.indexNow.key,
				batch,
			});
			if (result.type === "retry") {
				retry = { host: batch.host, reason: result.reason };
				break pages;
			}
			if (result.type === "rejected") {
				rejected.add(batch.origin);
				logger.error({
					message: `IndexNow rejected the changed pages for ${batch.host}: ${result.reason}`,
					owner: PLUGIN_KEY,
					data: {
						host: batch.host,
						status: result.status,
						urls: batch.urls.length,
					},
				});
				continue;
			}

			const clearRes = await clearSent(context, {
				urls: batch.urls,
				revision: data.revision,
			});
			if (clearRes.error) return clearRes;
			urlCount += batch.urls.length;
		}

		if (rows.length < indexNow.batchSize) break;
	}

	if (urlCount > 0) {
		const recordedRes = await recordSend(context, {
			sentAt: new Date().toISOString(),
			urlCount,
		});
		if (recordedRes.error) return recordedRes;
	}

	if (retry) {
		return {
			error: {
				type: "basic",
				status: 503,
				message: copy("server:plugin.seo.index.now.send.retry", {
					data: retry,
				}),
			},
			data: undefined,
		};
	}

	return { error: undefined, data: { urlCount } };
};

export default sendPending;
