import { referenceKey } from "../../../libs/agent/references.js";
import { getAgents } from "../../../libs/agent/registry.js";
import {
	agentRoutineEventsSchema,
	matchesRoutineEvent,
	type RoutineEventFacts,
} from "../../../libs/agent/routine-events.js";
import type { LucidAgentRoutinePending } from "../../../libs/db/tables/agent-routine-pending.js";
import {
	AgentRoutinePendingRepository,
	AgentRoutinesRepository,
	AgentRunsRepository,
} from "../../../libs/repositories/index.js";
import type {
	AgentResource,
	AgentRoutineEventName,
} from "../../../types/response.js";
import type {
	ServiceFn,
	ServiceResponse,
} from "../../../utils/services/types.js";

const pendingSubject = (
	subject: AgentResource,
): Pick<
	LucidAgentRoutinePending,
	"subject_type" | "subject_id" | "collection_key" | "subject_key"
> => {
	const key = referenceKey(subject);
	switch (subject.type) {
		case "document":
			return {
				subject_type: "document",
				subject_id: subject.documentId,
				collection_key: subject.collectionKey,
				subject_key: key,
			};
		case "media":
			return {
				subject_type: "media",
				subject_id: subject.mediaId,
				collection_key: null,
				subject_key: key,
			};
		case "request":
			return {
				subject_type: "request",
				subject_id: subject.requestId,
				collection_key: null,
				subject_key: key,
			};
	}
};

/**
 * Queues matching content changes for enabled routines.
 * @remarks Call in the transaction that writes the content so rollback removes queued events too.
 * Skips attributed changes from routine conversations, including retries and follow-ups.
 * Skips routines with invalid stored events.
 */
const recordRoutineEvent: ServiceFn<
	[
		{
			event: AgentRoutineEventName;
			subjects: AgentResource[];
			/**
			 * Subject facts matched against each routine's filters.
			 * @remarks Use a function to defer queries until a routine listens for the event.
			 */
			facts: RoutineEventFacts | (() => ServiceResponse<RoutineEventFacts>);
			/** The agent run that made the change, if any. */
			agentRunId?: string | null;
		},
	],
	undefined
> = async (context, input) => {
	if (input.subjects.length === 0 || getAgents(context.config).length === 0) {
		return { error: undefined, data: undefined };
	}

	if (input.agentRunId) {
		const AgentRuns = new AgentRunsRepository(context.db);

		const run = await AgentRuns.selectConversationKind(input.agentRunId);
		if (run.error) return run;
		if (run.data && run.data.kind !== "chat") {
			return { error: undefined, data: undefined };
		}
	}

	const AgentRoutines = new AgentRoutinesRepository(context.db);

	const routines = await AgentRoutines.selectMultiple({
		select: ["id", "events"],
		where: [
			{
				key: "enabled",
				operator: "=",
				value: context.config.db.getDefault("boolean", "true"),
			},
			{ key: "events", operator: "is not", value: null },
		],
	});
	if (routines.error) return routines;

	const listening = (routines.data ?? []).flatMap((routine) => {
		const events = agentRoutineEventsSchema.safeParse(routine.events);
		return events.success &&
			events.data.some((trigger) => trigger.event === input.event)
			? [{ id: routine.id, events: events.data }]
			: [];
	});
	if (listening.length === 0) return { error: undefined, data: undefined };

	let facts: RoutineEventFacts;
	if (typeof input.facts === "function") {
		const loaded = await input.facts();
		if (loaded.error) return loaded;
		facts = loaded.data;
	} else {
		facts = input.facts;
	}

	const routineIds = listening.flatMap((routine) =>
		routine.events?.some((trigger) =>
			matchesRoutineEvent(trigger, input.event, facts),
		)
			? [routine.id]
			: [],
	);
	if (routineIds.length === 0) return { error: undefined, data: undefined };

	const AgentRoutinePending = new AgentRoutinePendingRepository(context.db);
	const now = new Date().toISOString();
	const fields = facts.fields ?? [];
	const subjects = input.subjects.map(pendingSubject);
	const batchSize = context.config.db.getQueryBatchSize({
		parametersPerItem: 10 * routineIds.length,
		maxItems: 500,
	});

	for (let offset = 0; offset < subjects.length; offset += batchSize) {
		const batch = subjects.slice(offset, offset + batchSize);

		//* Merge prior and current field names for repeated events.
		const waiting = await AgentRoutinePending.selectMultiple({
			select: ["routine_id", "subject_key", "fields"],
			where: [
				{ key: "routine_id", operator: "in", value: routineIds },
				{ key: "event", operator: "=", value: input.event },
				{
					key: "subject_key",
					operator: "in",
					value: batch.map((subject) => subject.subject_key),
				},
			],
			validation: { enabled: true },
		});
		if (waiting.error) return waiting;

		const recorded = await AgentRoutinePending.record({
			event: input.event,
			rows: routineIds.flatMap((routineId) =>
				batch.map((subject) => {
					const earlier = waiting.data.find(
						(row) =>
							row.routine_id === routineId &&
							row.subject_key === subject.subject_key,
					);
					return {
						routineId,
						subject,
						fields: [...new Set([...(earlier?.fields ?? []), ...fields])],
					};
				}),
			),
			now,
		});
		if (recorded.error) return recorded;
	}

	return { error: undefined, data: undefined };
};

export default recordRoutineEvent;
