import type {
	LucidConfigDefinitionMeta,
	RuntimeConfigureLucid,
	WrappedLucidConfigDefinition,
} from "@lucidcms/core/types";

const configureLucid: RuntimeConfigureLucid = (
	definition: WrappedLucidConfigDefinition,
	meta?: LucidConfigDefinitionMeta,
) => {
	return {
		...definition,
		recipe: (draft) => {
			definition.recipe?.(draft);
			if (meta?.emailTemplates) {
				draft.email.templates.rendered = {
					...(draft.email.templates.rendered ?? {}),
					...Object.fromEntries(
						Object.entries(meta.emailTemplates).map(([key, value]) => [
							key,
							value.html,
						]),
					),
				};
			}
		},
	};
};

export default configureLucid;
