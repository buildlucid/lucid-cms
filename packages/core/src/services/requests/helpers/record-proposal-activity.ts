import {
	RequestDocumentsRepository,
	RequestEventsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Records proposal activity, combining consecutive content edits from the same user and agent run. */
const recordProposalActivity: ServiceFn<
	[
		{
			collectionKey: string;
			documentId: number;
			versionId: number;
			userId: number | null;
			agentRunId?: string;
		} & (
			| { type: "workflow_updated"; stage: string }
			| { type: "proposal_edited" }
		),
	],
	undefined
> = async (context, data) => {
	const RequestDocuments = new RequestDocumentsRepository(context.db);
	const RequestEvents = new RequestEventsRepository(context.db);

	const documentRes = await RequestDocuments.selectOpenForVersion({
		collectionKey: data.collectionKey,
		documentId: data.documentId,
		versionId: data.versionId,
	});
	if (documentRes.error) return documentRes;

	const document = documentRes.data;
	if (!document) return { error: undefined, data: undefined };

	if (data.type === "proposal_edited") {
		const latestRes = await RequestEvents.selectMultiple({
			select: ["type", "user_id", "agent_run_id", "metadata"],
			where: [{ key: "request_id", operator: "=", value: document.request_id }],
			orderBy: [{ column: "id", direction: "desc" }],
			limit: 1,
		});
		if (latestRes.error) return latestRes;

		const latest = latestRes.data?.[0];
		if (
			latest?.type === "proposal_edited" &&
			latest.user_id === data.userId &&
			latest.agent_run_id === (data.agentRunId ?? null) &&
			latest.metadata?.requestDocumentId === document.id
		) {
			return { error: undefined, data: undefined };
		}
	}

	const eventsRes = await RequestEvents.createEvents({
		data: [
			data.type === "workflow_updated"
				? {
						request_id: document.request_id,
						user_id: data.userId,
						agent_run_id: data.agentRunId ?? null,
						type: "workflow_updated",
						metadata: { requestDocumentId: document.id, stage: data.stage },
					}
				: {
						request_id: document.request_id,
						user_id: data.userId,
						agent_run_id: data.agentRunId ?? null,
						type: "proposal_edited",
						metadata: { requestDocumentId: document.id },
					},
		],
	});
	if (eventsRes.error) return eventsRes;

	return { error: undefined, data: undefined };
};

export default recordProposalActivity;
