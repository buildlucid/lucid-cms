import z from "zod";
import type { AgentScreen } from "../types/response.js";

/** The admin shortens longer labels, eg. a long document title, to fit. */
const screenLabelLength = 200;

const screenDetails = {
	tabId: z.string().trim().min(1).max(64),
	label: z.string().trim().max(screenLabelLength),
};
/** A list's applied filter preset, labelled like its name. */
const screenFilter = z.string().trim().max(screenLabelLength).nullable();

/** A document open in the builder, which the builder tools work on. */
export const documentScreenSchema = z
	.object({
		type: z.literal("document"),
		...screenDetails,
		collectionKey: z.string().min(1),
		documentId: z.number().int().positive().nullable(),
		requestId: z.number().int().positive().nullable(),
	})
	.strict();

/** The admin screen a message was sent from. */
export const agentScreenSchema = z.discriminatedUnion("type", [
	documentScreenSchema,
	z
		.object({
			type: z.literal("request"),
			...screenDetails,
			requestId: z.number().int().positive(),
		})
		.strict(),
	z
		.object({
			type: z.literal("documents"),
			...screenDetails,
			collectionKey: z.string().min(1),
			contentLocale: z.string().min(1).nullable(),
			filter: screenFilter,
		})
		.strict(),
	z
		.object({
			type: z.literal("media"),
			...screenDetails,
			folderId: z.number().int().positive().nullable(),
			filter: screenFilter,
		})
		.strict(),
	z
		.object({
			type: z.literal("requests"),
			...screenDetails,
			filter: screenFilter,
		})
		.strict(),
	z.object({ type: z.literal("review"), ...screenDetails }).strict(),
	z
		.object({
			type: z.literal("history"),
			...screenDetails,
			collectionKey: z.string().min(1),
			documentId: z.number().int().positive(),
			versionId: z.number().int().positive().nullable(),
		})
		.strict(),
]) satisfies z.ZodType<AgentScreen>;
