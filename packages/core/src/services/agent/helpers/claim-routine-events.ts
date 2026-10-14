import constants from "../../../constants/constants.js";
import { referenceKey } from "../../../libs/agent/references.js";
import { agentRoutineEventNameSchema } from "../../../libs/agent/routine-events.js";
import type { LucidAgentRoutinePending } from "../../../libs/db/tables/agent-routine-pending.js";
import { AgentRoutinePendingRepository } from "../../../libs/repositories/index.js";
import type {
	AgentReferenceInput,
	AgentRoutineEventName,
} from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import resolveUserAccess from "../../users/resolve-access.js";
import describe from "../references/describe.js";
import referenceAccess from "../references/reference-access.js";

export type ClaimedRoutineEvent = {
	reference: AgentReferenceInput;
	events: AgentRoutineEventName[];
	/** What the changes touched, such as `["file"]`. */
	fields: string[];
};

/** Builds a resource reference, requiring a collection key for documents. */
const pendingReference = (
	row: Pick<
		LucidAgentRoutinePending,
		"subject_type" | "subject_id" | "collection_key"
	>,
): AgentReferenceInput | undefined => {
	switch (row.subject_type) {
		case "document":
			return row.collection_key === null
				? undefined
				: {
						type: "document",
						collectionKey: row.collection_key,
						documentId: row.subject_id,
					};
		case "media":
			return { type: "media", mediaId: row.subject_id };
		case "request":
			return { type: "request", requestId: row.subject_id };
	}
};

/**
 * Claims the oldest pending changes by resource, dropping deleted or unreadable subjects.
 * @remarks Call in the transaction that starts the run so startup failures restore claimed changes.
 */
const claimRoutineEvents: ServiceFn<
	[{ routineId: string; userId: number | null }],
	ClaimedRoutineEvent[]
> = async (context, input) => {
	const { subjectsPerRun } = constants.agent.routineEvents;
	const AgentRoutinePending = new AgentRoutinePendingRepository(context.db);

	const waiting = await AgentRoutinePending.selectMultiple({
		select: ["id", "subject_key"],
		where: [{ key: "routine_id", operator: "=", value: input.routineId }],
		orderBy: [{ column: "first_at", direction: "asc" }],
		//* Allow one row per event for each resource selected for the run.
		limit: subjectsPerRun * agentRoutineEventNameSchema.options.length,
		validation: { enabled: true },
	});
	if (waiting.error) return waiting;

	const subjects = [
		...new Set(waiting.data.map((row) => row.subject_key)),
	].slice(0, subjectsPerRun);
	const ids = waiting.data.flatMap((row) =>
		subjects.includes(row.subject_key) ? [row.id] : [],
	);
	if (ids.length === 0) return { error: undefined, data: [] };

	//* Claim only deleted rows so concurrent starts cannot consume the same change.
	const claimed = await AgentRoutinePending.deleteMultiple({
		where: [{ key: "id", operator: "in", value: ids }],
		returning: [
			"event",
			"subject_type",
			"subject_id",
			"collection_key",
			"fields",
			"first_at",
		],
		validation: { enabled: true },
	});
	if (claimed.error) return claimed;

	const grouped = new Map<string, ClaimedRoutineEvent>();
	for (const row of claimed.data.toSorted(
		(a, b) => new Date(a.first_at).getTime() - new Date(b.first_at).getTime(),
	)) {
		const reference = pendingReference(row);
		if (!reference) continue;

		const key = referenceKey(reference);
		const group = grouped.get(key);
		if (group) {
			group.events.push(row.event);
			group.fields = [...new Set([...group.fields, ...row.fields])];
		} else {
			grouped.set(key, { reference, events: [row.event], fields: row.fields });
		}
	}
	const references = [...grouped.values()].map((group) => group.reference);
	if (references.length === 0) return { error: undefined, data: [] };

	const grant =
		input.userId === null
			? undefined
			: await resolveUserAccess(context, { userId: input.userId });
	if (grant?.error) return grant;

	const [access, details] = await Promise.all([
		referenceAccess(context, {
			references,
			userId: input.userId,
			grant: grant?.data,
		}),
		describe(context, { references }),
	]);
	if (access.error) return access;
	if (details.error) return details;

	return {
		error: undefined,
		data: [...grouped.entries()].flatMap(([key, group]) =>
			details.data.has(key) && access.data.canRead(group.reference)
				? [group]
				: [],
		),
	};
};

export default claimRoutineEvents;
