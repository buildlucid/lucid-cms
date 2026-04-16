import type {
	LucidConfig,
	LucidConfigDefinition,
	LucidConfigDefinitionMeta,
	RuntimeDefineConfig,
} from "@lucidcms/core/types";

const defineConfig: RuntimeDefineConfig = <AdapterFrom extends string>(
	definition: LucidConfigDefinition<AdapterFrom>,
	meta?: LucidConfigDefinitionMeta,
): LucidConfigDefinition<AdapterFrom> => {
	return {
		...definition,
		config: (env) => {
			const lucidConfig = definition.config(env);
			return {
				...lucidConfig,
				preRenderedEmailTemplates: meta?.emailTemplates
					? Object.fromEntries(
							Object.entries(meta.emailTemplates).map(([key, value]) => [
								key,
								value.html,
							]),
						)
					: undefined,
			} satisfies LucidConfig;
		},
	};
};

export default defineConfig;
