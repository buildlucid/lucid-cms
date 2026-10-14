import type { RequestType } from "../../../libs/db/tables/requests.js";
import type { DocumentChangeMetadata } from "../../../libs/hooks/types.js";
import type { AgentRoutineEventName } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import recordRoutineEvent from "../../agent/helpers/record-routine-event.js";
import invalidateContentDocumentCache from "../../documents/helpers/invalidate-content-cache.js";
import notifyChange from "../../documents/notify-change.js";
import type { RequestDocumentRecord } from "../types.js";

type ChangedDocument = Pick<
	RequestDocumentRecord,
	"collection_key" | "document_id"
>;

const routineEvents: Partial<
	Record<DocumentChangeMetadata["type"], AgentRoutineEventName>
> = {
	created: "documents:created",
	updated: "documents:updated",
	published: "documents:published",
};

/**
 * Invalidates content caches and notifies dependants and routines once per collection and change.
 * @remarks Call after request completion routes and hooks have settled.
 */
const notifyRequestChanges: ServiceFn<
	[
		{
			type: RequestType;
			promoted: Array<{ document: ChangedDocument; target: string }>;
			unpublished: Array<{ document: ChangedDocument; target: string }>;
			deleted: ChangedDocument[];
			/** The agent run that completed the request, if any. */
			agentRunId?: string;
		},
	],
	undefined
> = async (context, data) => {
	const changes: Array<{
		document: ChangedDocument;
		change: DocumentChangeMetadata;
	}> = [
		...data.promoted.map((entry) => ({
			document: entry.document,
			change:
				entry.target !== "latest"
					? { type: "published" as const, version: entry.target }
					: data.type === "create"
						? { type: "created" as const }
						: { type: "updated" as const, version: "latest" },
		})),
		...data.unpublished.map((entry) => ({
			document: entry.document,
			change: { type: "unpublished" as const, version: entry.target },
		})),
		...data.deleted.map((document) => ({
			document,
			change: { type: "deleted" as const, permanent: false },
		})),
	];

	for (const collectionKey of new Set(
		changes.map((entry) => entry.document.collection_key),
	)) {
		await invalidateContentDocumentCache(context, collectionKey);
	}
	for (const entries of Map.groupBy(
		changes,
		(entry) =>
			`${entry.document.collection_key}:${JSON.stringify(entry.change)}`,
	).values()) {
		const [first] = entries;
		if (!first) continue;
		const ids = [
			...new Set(entries.map((entry) => entry.document.document_id)),
		];
		const changed = await notifyChange(context, {
			change: first.change,
			collectionKey: first.document.collection_key,
			ids,
		});
		if (changed.error) return changed;

		const event = routineEvents[first.change.type];
		if (!event) continue;

		const recorded = await recordRoutineEvent(context, {
			event,
			subjects: ids.map((documentId) => ({
				type: "document",
				collectionKey: first.document.collection_key,
				documentId,
			})),
			facts: { collections: [first.document.collection_key] },
			agentRunId: data.agentRunId,
		});
		if (recorded.error) return recorded;
	}

	return { error: undefined, data: undefined };
};

export default notifyRequestChanges;
