import type z from "zod";
import type { ResolvedLucidConfig } from "../../../../types/config.js";
import requiresReview from "../../helpers/requires-review.js";
import type { inputSchema } from "./schema.js";

/** Checks whether an existing request or collection review prevents a direct delete. */
const deleteRequested = (
	config: ResolvedLucidConfig,
	input: Pick<z.output<typeof inputSchema>, "collectionKey" | "requestId">,
) =>
	input.requestId !== undefined ||
	requiresReview(
		config.collections.find(
			(collection) => collection.key === input.collectionKey,
		),
		{ type: "delete" },
	);

export default deleteRequested;
