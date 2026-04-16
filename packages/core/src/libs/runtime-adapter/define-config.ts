import type { LucidConfigDefinition } from "./types.js";

const defineConfig = <AdapterFrom extends string>(
	definition: LucidConfigDefinition<AdapterFrom>,
): LucidConfigDefinition<AdapterFrom> => {
	return definition;
};

export default defineConfig;
