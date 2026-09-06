import type {
	LucidConfigDefinition,
	LucidConfigDefinitionMeta,
	RuntimeAdaptConfig,
} from "@lucidcms/core/types";

const adaptConfig: RuntimeAdaptConfig = (
	definition: LucidConfigDefinition,
	meta?: LucidConfigDefinitionMeta,
) => {
	return {
		...definition,
		configure: (draft) => {
			if (meta?.emailTemplates) {
				draft.email.templates = {
					...(draft.email.templates ?? {}),
					...Object.fromEntries(
						Object.entries(meta.emailTemplates).map(([key, value]) => [
							key,
							value.html,
						]),
					),
				};
			}
			definition.configure?.(draft);
		},
	};
};

export default adaptConfig;
