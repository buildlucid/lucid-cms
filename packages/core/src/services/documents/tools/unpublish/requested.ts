import type z from "zod";
import type { ResolvedLucidConfig } from "../../../../types/config.js";
import requiresReview from "../../helpers/requires-review.js";
import type { inputSchema } from "./schema.js";

/** Checks whether an existing request, or the collection requiring review for the environment, prevents direct unpublishing. */
const unpublishRequested = (
	config: ResolvedLucidConfig,
	input: Pick<
		z.output<typeof inputSchema>,
		"collectionKey" | "requestId" | "environment"
	>,
) =>
	input.requestId !== undefined ||
	requiresReview(
		config.collections.find(
			(collection) => collection.key === input.collectionKey,
		),
		{ type: "unpublish", environment: input.environment },
	);

export default unpublishRequested;
