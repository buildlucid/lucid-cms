import type {
	LucidConfigDefinitionMeta,
	RuntimeConfigureLucid,
	WrappedLucidConfigDefinition,
} from "@lucidcms/core/types";

const configureLucid: RuntimeConfigureLucid = <
	AdapterModule extends string,
	DatabaseModule extends string,
>(
	definition: WrappedLucidConfigDefinition<AdapterModule, DatabaseModule>,
	meta?: LucidConfigDefinitionMeta,
) => {
	return {
		...definition,
		recipe: (draft) => {
			definition.recipe?.(draft);
			draft.preRenderedEmailTemplates = meta?.emailTemplates
				? Object.fromEntries(
						Object.entries(meta.emailTemplates).map(([key, value]) => [
							key,
							value.html,
						]),
					)
				: undefined;
		},
	};
};

export default configureLucid;
