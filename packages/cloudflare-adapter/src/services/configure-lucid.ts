import type {
	LucidConfig,
	LucidConfigDefinition,
	LucidConfigDefinitionMeta,
	RuntimeConfigureLucid,
} from "@lucidcms/core/types";
import { produce } from "immer";

const configureLucid: RuntimeConfigureLucid = <
	AdapterModule extends string,
	DatabaseModule extends string,
>(
	definition: LucidConfigDefinition<AdapterModule, DatabaseModule>,
	meta?: LucidConfigDefinitionMeta,
): LucidConfigDefinition<AdapterModule, DatabaseModule> => {
	return produce(definition, (draft) => {
		draft.config = (env) => {
			const lucidConfig = definition.config(env);

			return produce(lucidConfig, (lucidDraft) => {
				lucidDraft.preRenderedEmailTemplates = meta?.emailTemplates
					? Object.fromEntries(
							Object.entries(meta.emailTemplates).map(([key, value]) => [
								key,
								value.html,
							]),
						)
					: undefined;
			}) satisfies LucidConfig;
		};
	});
};

export default configureLucid;
