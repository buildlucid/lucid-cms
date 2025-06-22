import type { LucidAdapterDefineConfig } from "@lucidcms/core/types";

const defineConfig = (
	factory: LucidAdapterDefineConfig,
): LucidAdapterDefineConfig => {
	return (env) => factory(env);
	// ({
	// 	...factory(env),
	// 	honoExtensions: [],
	// }) satisfies LucidConfig;
};

export default defineConfig;
