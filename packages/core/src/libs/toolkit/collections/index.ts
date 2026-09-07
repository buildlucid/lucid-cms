import type { ServiceContext } from "../../../utils/services/types.js";
import getSchema from "./get-schema/index.js";

/** Collection metadata for server-side tools and custom queries. */
export type ToolkitCollections = {
	/** Returns effective tables, columns, foreign keys and migration readiness. Does not run migrations. */
	getSchema: (
		input: Parameters<typeof getSchema>[1],
	) => ReturnType<typeof getSchema>;
};

const createCollectionsToolkit = (
	context: ServiceContext,
): ToolkitCollections => ({ getSchema: (input) => getSchema(context, input) });

export default createCollectionsToolkit;
