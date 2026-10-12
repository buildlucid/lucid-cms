import type z from "zod";
import type { ResolvedLucidConfig } from "../../../../types/config.js";
import type { inputSchema } from "./schema.js";

/** Checks whether an existing request or collection review prevents a direct delete. */
const deleteRequested = (
	config: ResolvedLucidConfig,
	input: Pick<z.output<typeof inputSchema>, "collectionKey" | "requestId">,
) =>
	input.requestId !== undefined ||
	config.collections.find(
		(collection) => collection.key === input.collectionKey,
	)?.getData.publishing.review?.delete === true;

export default deleteRequested;
