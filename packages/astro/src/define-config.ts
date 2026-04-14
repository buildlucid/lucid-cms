import type {
	ExtendedAdapterDefineConfig,
	LucidConfig,
	RenderedTemplates,
} from "@lucidcms/core/types";

type AstroConfigFactory = ExtendedAdapterDefineConfig<
	[
		meta?: {
			emailTemplates?: RenderedTemplates;
		},
	]
>;

const defineConfig = (factory: AstroConfigFactory): AstroConfigFactory => {
	return (env, meta) => {
		const lucidConfig = factory(env, meta);
		return {
			...lucidConfig,
			preRenderedEmailTemplates: meta?.emailTemplates
				? Object.fromEntries(
						Object.entries(meta.emailTemplates).map(([key, value]) => [
							key,
							value.html,
						]),
					)
				: lucidConfig.preRenderedEmailTemplates,
		} satisfies LucidConfig;
	};
};

export default defineConfig;
