import { agentFormatter } from "../../libs/formatters/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type { AgentCatalog } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

const getDefinitions: ServiceFn<
	[{ authUser: LucidAuth }],
	AgentCatalog
> = async (context, input) => ({
	error: undefined,
	data: agentFormatter.formatDefinitions({
		config: context.config,
		authUser: input.authUser,
		adminTranslations: context.translate
			.forLocale(context.config.i18n.defaultLocale)
			.adminBundle(),
	}),
});

export default getDefinitions;
