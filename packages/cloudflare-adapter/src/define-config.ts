import type {
	ExtendedAdapterDefineConfig,
	LucidConfig,
	RenderedTemplates,
} from "@lucidcms/core/types";

type CloudfalreConfigFactory = ExtendedAdapterDefineConfig<
	[
		meta?: {
			emailTemplates?: RenderedTemplates;
		},
	]
>;

const defineConfig = (
	factory: CloudfalreConfigFactory,
): CloudfalreConfigFactory => {
	return (env, meta) => {
		const lucidConfig = factory(env, meta);
		return {
			...lucidConfig,
			preRenderedEmailTemplates: meta?.emailTemplates
				? Object.fromEntries(
						Object.entries(meta?.emailTemplates).map(([key, value]) => [
							key,
							value.html,
						]),
					)
				: undefined,
		} satisfies LucidConfig;
	};
};

export default defineConfig;
