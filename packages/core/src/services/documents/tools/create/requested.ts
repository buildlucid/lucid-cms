import type z from "zod";
import type { ResolvedLucidConfig } from "../../../../types/config.js";
import type { inputSchema } from "./schema.js";

/** Checks whether collection review requires a create request despite direct-write mode. */
const createRequested = (
	config: ResolvedLucidConfig,
	input: Pick<z.output<typeof inputSchema>, "collectionKey">,
) =>
	config.collections.find(
		(collection) => collection.key === input.collectionKey,
	)?.getData.publishing.review?.create === true;

export default createRequested;
