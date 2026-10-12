import type z from "zod";
import type { ResolvedLucidConfig } from "../../../../types/config.js";
import type { inputSchema } from "./schema.js";

/** Checks whether an existing request or target-specific collection review prevents direct unpublishing. */
const unpublishRequested = (
	config: ResolvedLucidConfig,
	input: Pick<
		z.output<typeof inputSchema>,
		"collectionKey" | "requestId" | "target"
	>,
) =>
	input.requestId !== undefined ||
	config.collections
		.find((collection) => collection.key === input.collectionKey)
		?.getData.publishing.review?.unpublish.includes(input.target) === true;

export default unpublishRequested;
