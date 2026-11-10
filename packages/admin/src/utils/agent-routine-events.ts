import type {
	AgentRoutine,
	ContentEvent,
	ContentEventFilter,
	ContentEventName,
	AgentRoutineTrigger,
	MediaType,
} from "@types";
import T, { type TranslationKeys } from "@/translations";
import { describeSchedule } from "@/utils/agent-schedule";

/** An editable routine event whose unsupported filters are omitted when saved. */
export interface RoutineEventDraft {
	event: ContentEventName;
	filter: ContentEventFilter;
}

/** The most events a routine can listen for, matching the API's limit. */
export const maxRoutineEvents = 20;

/** Event labels and supported filters, in form display order. */
const routineEvents = {
	"documents:created": {
		label: "agent.routine.event.documents.created",
		filters: ["collections"],
	},
	"documents:updated": {
		label: "agent.routine.event.documents.updated",
		filters: ["collections"],
	},
	"documents:published": {
		label: "agent.routine.event.documents.published",
		filters: ["collections"],
	},
	"requests:created": {
		label: "agent.routine.event.requests.created",
		filters: ["collections", "requestTypes"],
	},
	"requests:updated": {
		label: "agent.routine.event.requests.updated",
		filters: ["collections", "requestTypes"],
	},
	"requests:approved": {
		label: "agent.routine.event.requests.approved",
		filters: ["collections", "requestTypes"],
	},
	"requests:completed": {
		label: "agent.routine.event.requests.completed",
		filters: ["collections", "requestTypes"],
	},
	"media:created": {
		label: "agent.routine.event.media.created",
		filters: ["mediaTypes"],
	},
	"media:updated": {
		label: "agent.routine.event.media.updated",
		filters: ["mediaTypes", "fields"],
	},
} as const satisfies Record<
	ContentEventName,
	{
		label: TranslationKeys;
		filters: readonly (keyof ContentEventFilter)[];
	}
>;

export const routineEventNames = Object.keys(
	routineEvents,
) as ContentEventName[];

export const mediaTypes = [
	"image",
	"video",
	"audio",
	"document",
	"archive",
	"unknown",
] as const satisfies MediaType[];

export const routineEventLabel = (event: ContentEventName) =>
	T()(routineEvents[event].label);

export const offersRoutineFilter = (
	event: ContentEventName,
	filter: keyof ContentEventFilter,
) => {
	const filters: readonly (keyof ContentEventFilter)[] =
		routineEvents[event].filters;
	return filters.includes(filter);
};

/** A routine's event labels, once each, in the order they were added. */
export const routineEventLabels = (events: ContentEvent[]) => [
	...new Set(events.map((event) => routineEventLabel(event.event))),
];

const triggerLabels = {
	schedule: "agent.routine.trigger.schedule",
	manual: "agent.routine.trigger.manual",
	event: "agent.routine.trigger.event",
} as const satisfies Record<AgentRoutineTrigger, TranslationKeys>;

/** What started a routine run, such as "Started by content changes". */
export const routineTriggerLabel = (trigger: AgentRoutineTrigger) =>
	T()(triggerLabels[trigger]);

/** Omits unsupported and empty filters, with omitted filters matching all values. */
const pickFilter = <Key extends keyof ContentEventFilter>(
	filter: ContentEventFilter,
	keys: readonly Key[],
) => {
	const picked: Partial<Pick<ContentEventFilter, Key>> = {};
	for (const key of keys) {
		if (filter[key]?.length) picked[key] = filter[key];
	}
	return Object.keys(picked).length ? { filter: picked } : {};
};

/**
 * Turns a draft into the event the API saves.
 * @remarks Separate branches preserve each event's filter type.
 */
export const toRoutineEvent = (draft: RoutineEventDraft): ContentEvent => {
	switch (draft.event) {
		case "documents:created":
		case "documents:updated":
		case "documents:published":
			return {
				event: draft.event,
				...pickFilter(draft.filter, routineEvents[draft.event].filters),
			};
		case "requests:created":
		case "requests:updated":
		case "requests:approved":
		case "requests:completed":
			return {
				event: draft.event,
				...pickFilter(draft.filter, routineEvents[draft.event].filters),
			};
		case "media:created":
			return {
				event: draft.event,
				...pickFilter(draft.filter, routineEvents[draft.event].filters),
			};
		case "media:updated":
			return {
				event: draft.event,
				...pickFilter(draft.filter, routineEvents[draft.event].filters),
			};
	}
};

export const toRoutineEventDraft = (
	event: ContentEvent,
): RoutineEventDraft => ({
	event: event.event,
	filter: { ...event.filter },
});

/** Summarizes schedule and event triggers, such as "Every day at 09:00 · UTC, Media added". */
export const describeTriggers = (
	routine: Pick<AgentRoutine, "schedule" | "events">,
) =>
	[
		...(routine.schedule
			? [
					`${describeSchedule(routine.schedule.cron)} · ${routine.schedule.timezone}`,
				]
			: []),
		...routineEventLabels(routine.events),
	].join(", ");
