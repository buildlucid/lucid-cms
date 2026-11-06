import {
	RequestDocumentsRepository,
	RequestEventsRepository,
	RequestTargetsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import touchesLocales from "./touches-locales.js";

/**
 * Records target changes and clears affected acknowledgements. Unaffected locale-limited requests
 * carry approval and acknowledgement forward to the new version.
 */
const recordTargetChange: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			target: string;
			/** Whether the target's version was removed rather than replaced. */
			unpublished?: boolean;
			/** The request making the change. Null for a direct change. */
			requestId?: number;
			/** The locales the change wrote, with null for shared content. Null or left out when unknown. */
			changedLocales?: ReadonlyArray<string | null> | null;
			/** The target's new version, which unaffected locale-limited requests move on to. */
			versionId?: number;
			userId: number | null;
			agentRunId?: string;
		},
	],
	undefined
> = async (context, data) => {
	const RequestDocuments = new RequestDocumentsRepository(context.db);
	const RequestEvents = new RequestEventsRepository(context.db);
	const RequestTargets = new RequestTargetsRepository(context.db);

	const documentsRes = await RequestDocuments.selectIncompleteForDocument({
		collectionKey: data.collectionKey,
		documentId: data.documentId,
		target: data.target === "latest" ? "latest" : undefined,
	});
	if (documentsRes.error) return documentsRes;

	const others = documentsRes.data.filter(
		(document) => document.request_id !== data.requestId,
	);
	const documents = others.filter((document) =>
		touchesLocales(document.locales, data.changedLocales),
	);
	const unaffected = others.filter(
		(document) => !touchesLocales(document.locales, data.changedLocales),
	);

	if (unaffected.length > 0 && data.versionId !== undefined) {
		const unaffectedIds = unaffected.map((document) => document.id);
		const approvedRes = await RequestTargets.updateMultiple({
			data: { approved_version_id: data.versionId },
			where: [
				{ key: "request_document_id", operator: "in", value: unaffectedIds },
				{ key: "target", operator: "=", value: data.target },
				{ key: "approved_version_id", operator: "is not", value: null },
			],
		});
		if (approvedRes.error) return approvedRes;

		const acknowledgedRes = await RequestTargets.updateMultiple({
			data: { acknowledged_version_id: data.versionId },
			where: [
				{ key: "request_document_id", operator: "in", value: unaffectedIds },
				{ key: "target", operator: "=", value: data.target },
				{ key: "acknowledged_version_id", operator: "is not", value: null },
			],
		});
		if (acknowledgedRes.error) return acknowledgedRes;
	}
	if (documents.length === 0) return { error: undefined, data: undefined };

	const eventsRes = await RequestEvents.createEvents({
		data: documents.map((document) => ({
			request_id: document.request_id,
			user_id: data.userId,
			agent_run_id: data.agentRunId ?? null,
			type: data.unpublished
				? ("target_unpublished" as const)
				: ("target_published" as const),
			metadata: {
				target: data.target,
				requestDocumentId: document.id,
				sourceRequestId: data.requestId ?? null,
			},
		})),
	});
	if (eventsRes.error) return eventsRes;

	const acknowledgementsRes = await RequestTargets.updateMultiple({
		data: {
			acknowledged_version_id: null,
			acknowledged_by: null,
			acknowledged_by_run_id: null,
			acknowledged_at: null,
		},
		where: [
			{
				key: "request_document_id",
				operator: "in",
				value: documents.map((document) => document.id),
			},
			{ key: "target", operator: "=", value: data.target },
		],
	});
	if (acknowledgementsRes.error) return acknowledgementsRes;

	return { error: undefined, data: undefined };
};

export default recordTargetChange;
