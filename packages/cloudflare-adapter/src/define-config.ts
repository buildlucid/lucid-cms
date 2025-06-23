import type { LucidAdapterDefineConfig } from "@lucidcms/core/types";

const defineConfig = (
	factory: LucidAdapterDefineConfig,
): LucidAdapterDefineConfig => {
	return factory;
	// ({
	// 	...factory(env),
	// 	hono: {
	// 		middleware: [],
	// 		extensions: [],
	// 	},
	// }) satisfies LucidConfig;
};

export default defineConfig;
