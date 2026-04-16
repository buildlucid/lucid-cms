import type { LucidConfigDefinition } from "./types.js";

const configureLucid = <AdapterFrom extends string>(
	definition: LucidConfigDefinition<AdapterFrom>,
): LucidConfigDefinition<AdapterFrom> => {
	return definition;
};

export default configureLucid;
