import type {
	LucidConfig,
	LucidConfigDefinition,
	LucidConfigDefinitionMeta,
	RuntimeConfigureLucid,
} from "@lucidcms/core/types";
import { produce } from "immer";

const configureLucid: RuntimeConfigureLucid = <AdapterFrom extends string>(
	definition: LucidConfigDefinition<AdapterFrom>,
	meta?: LucidConfigDefinitionMeta,
): LucidConfigDefinition<AdapterFrom> => {
	return produce(definition, (draft) => {
		draft.config = (env) => {
			const lucidConfig = definition.config(env);

			return produce(lucidConfig, (lucidDraft) => {
				if (meta?.emailTemplates) {
					lucidDraft.preRenderedEmailTemplates = Object.fromEntries(
						Object.entries(meta.emailTemplates).map(([key, value]) => [
							key,
							value.html,
						]),
					);
				}
			}) satisfies LucidConfig;
		};
	});
};

export default configureLucid;
