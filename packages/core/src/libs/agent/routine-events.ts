import z from "zod";
import { mediaTypeSchema } from "../../schemas/media.js";
import { requestTypeSchema } from "../../schemas/requests.js";
import type {
	AgentRoutineEvent,
	AgentRoutineEventFilter,
	AgentRoutineEventName,
	MediaType,
	RequestType,
} from "../../types/response.js";

/* Keep events and filters additive, and omitted filters unrestricted, so saved routines remain compatible. */

const collectionsSchema = z.array(z.string().trim().min(1)).min(1).max(100);
const requestTypesSchema = z.array(requestTypeSchema).min(1);
const mediaTypesSchema = z.array(mediaTypeSchema).min(1);

const documentEventsSchema = z.enum([
	"documents:created",
	"documents:updated",
	"documents:published",
]);
const requestEventsSchema = z.enum([
	"requests:created",
	"requests:updated",
	"requests:approved",
	"requests:completed",
]);

export const agentRoutineEventSchema = z.discriminatedUnion("event", [
	z
		.object({
			event: documentEventsSchema,
			filter: z
				.object({ collections: collectionsSchema.optional() })
				.strict()
				.optional(),
		})
		.strict(),
	z
		.object({
			event: requestEventsSchema,
			filter: z
				.object({
					collections: collectionsSchema.optional(),
					requestTypes: requestTypesSchema.optional(),
				})
				.strict()
				.optional(),
		})
		.strict(),
	z
		.object({
			event: z.literal("media:created"),
			filter: z
				.object({ mediaTypes: mediaTypesSchema.optional() })
				.strict()
				.optional(),
		})
		.strict(),
	z
		.object({
			event: z.literal("media:updated"),
			filter: z
				.object({
					mediaTypes: mediaTypesSchema.optional(),
					fields: z
						.array(z.enum(["file"]))
						.min(1)
						.optional(),
				})
				.strict()
				.optional(),
		})
		.strict(),
]) satisfies z.ZodType<AgentRoutineEvent>;

export const agentRoutineEventsSchema = z
	.array(agentRoutineEventSchema)
	.max(20);

export const agentRoutineEventNameSchema = z.enum([
	...documentEventsSchema.options,
	...requestEventsSchema.options,
	"media:created",
	"media:updated",
]) satisfies z.ZodType<AgentRoutineEventName>;

/** Event subject facts used to evaluate a routine's filters. */
export type RoutineEventFacts = {
	collections?: readonly string[];
	requestType?: RequestType;
	mediaType?: MediaType;
	fields?: readonly NonNullable<AgentRoutineEventFilter["fields"]>[number][];
};

/** Matches the event name and every configured filter, treating omitted filters as unrestricted. */
export const matchesRoutineEvent = (
	trigger: AgentRoutineEvent,
	event: AgentRoutineEventName,
	facts: RoutineEventFacts,
) => {
	if (trigger.event !== event) return false;
	const filter: AgentRoutineEventFilter = trigger.filter ?? {};

	if (
		filter.collections &&
		!facts.collections?.some((key) => filter.collections?.includes(key))
	) {
		return false;
	}
	if (
		filter.requestTypes &&
		(!facts.requestType || !filter.requestTypes.includes(facts.requestType))
	) {
		return false;
	}
	if (
		filter.mediaTypes &&
		(!facts.mediaType || !filter.mediaTypes.includes(facts.mediaType))
	) {
		return false;
	}
	if (
		filter.fields &&
		!facts.fields?.some((field) => filter.fields?.includes(field))
	) {
		return false;
	}
	return true;
};
