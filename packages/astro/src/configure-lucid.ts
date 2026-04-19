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
			if (meta?.emailTemplates) {
				draft.preRenderedEmailTemplates = Object.fromEntries(
					Object.entries(meta.emailTemplates).map(([key, value]) => [
						key,
						value.html,
					]),
				);
			}
		},
	};
};

export default configureLucid;
