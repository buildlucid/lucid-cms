import collections from "../../libs/collection/collections.js";
import type { ServiceFn } from "../../utils/services/types.js";
import emitDocumentChange from "../documents/helpers/emit-change.js";
import invalidateContentDocumentCache from "../documents/helpers/invalidate-content-cache.js";
import getDependantVersions, {
	type ChangedTarget,
} from "./helpers/get-dependant-versions.js";

type ChangeGroup = {
	collectionKey: string;
	version: string;
	ids: number[];
};

/** Follows stored references without loading content. Each document/version is
 * visited once, so changes propagate along chains and stop at cycles. */
const notifyDependants: ServiceFn<[ChangedTarget], undefined> = async (
	context,
	data,
) => {
	if (data.ids.length === 0) return { error: undefined, data: undefined };

	const configured = await collections.getAll(context, {});
	if (configured.error) return configured;

	const batchSize = context.config.db.getQueryBatchSize({
		parametersPerItem: 1,
		reservedParameters: 4,
		maxItems: 500,
	});
	const rootIds = new Set(data.ids);
	const pending: ChangedTarget[] = [data];
	const queued = new Map<string, ChangedTarget>();
	const visited = new Set<string>();
	const notifications = new Map<string, ChangeGroup>();

	for (const target of pending) {
		queued.delete(JSON.stringify([target.table, target.version]));

		const dependants = await getDependantVersions(context, {
			target,
			collections: configured.data,
			batchSize,
		});
		if (dependants.error) return dependants;

		for (const dependant of dependants.data) {
			const { collectionKey, documentId, version, table } = dependant;
			const key = JSON.stringify([collectionKey, documentId, version]);
			if (visited.has(key)) continue;
			visited.add(key);

			// The originating change already notified these documents.
			const isRoot =
				data.resource === "documents" &&
				data.collectionKey === collectionKey &&
				rootIds.has(documentId) &&
				(data.version === undefined || data.version === version);
			if (isRoot) continue;

			const groupKey = JSON.stringify([collectionKey, version]);
			let group = notifications.get(groupKey);
			if (!group) {
				group = { collectionKey, version, ids: [] };
				notifications.set(groupKey, group);
			}
			group.ids.push(documentId);

			// Combine queued targets that share a table and publication perspective.
			const queueKey = JSON.stringify([table, version]);
			let next = queued.get(queueKey);
			if (!next) {
				next = {
					resource: "documents",
					table,
					collectionKey,
					version,
					ids: [],
				};
				pending.push(next);
				queued.set(queueKey, next);
			}
			next.ids.push(documentId);
		}
	}

	// Discover the complete chain before invoking subscribers.
	const invalidated = new Set<string>();
	for (const group of notifications.values()) {
		if (!invalidated.has(group.collectionKey)) {
			await invalidateContentDocumentCache(context, group.collectionKey);
			invalidated.add(group.collectionKey);
		}

		for (let offset = 0; offset < group.ids.length; offset += batchSize) {
			const result = await emitDocumentChange(context, {
				collectionKey: group.collectionKey,
				ids: group.ids.slice(offset, offset + batchSize),
				change: { type: "referencesUpdated", version: group.version },
			});
			if (result.error) return result;
		}
	}

	return { error: undefined, data: undefined };
};

export default notifyDependants;
