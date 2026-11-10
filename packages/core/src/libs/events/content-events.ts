import z from "zod";
import { mediaTypeSchema } from "../../schemas/media.js";
import { requestTypeSchema } from "../../schemas/requests.js";
import type {
	ContentEvent,
	ContentEventFilter,
	ContentEventName,
	MediaType,
	RequestType,
} from "../../types/response.js";

/* Content events for saved subscriptions such as routines. Code uses hooks. */

/* Keep events and filters additive, with omitted filters unrestricted, for saved subscriptions. */

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

export const contentEventSchema = z.discriminatedUnion("event", [
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
]) satisfies z.ZodType<ContentEvent>;

export const contentEventsSchema = z.array(contentEventSchema).max(20);

export const contentEventNameSchema = z.enum([
	...documentEventsSchema.options,
	...requestEventsSchema.options,
	"media:created",
	"media:updated",
]) satisfies z.ZodType<ContentEventName>;

/** Event subject facts used to evaluate a listener's filters. */
export type ContentEventFacts = {
	collections?: readonly string[];
	requestType?: RequestType;
	mediaType?: MediaType;
	fields?: readonly NonNullable<ContentEventFilter["fields"]>[number][];
};

/** Matches the event name and every configured filter, treating omitted filters as unrestricted. */
export const matchesContentEvent = (
	trigger: ContentEvent,
	event: ContentEventName,
	facts: ContentEventFacts,
) => {
	if (trigger.event !== event) return false;
	const filter: ContentEventFilter = trigger.filter ?? {};

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
