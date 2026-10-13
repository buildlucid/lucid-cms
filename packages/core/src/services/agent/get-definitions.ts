import { agentFormatter } from "../../libs/formatters/index.js";
import type { LucidAuth } from "../../types/hono.js";
import type { AgentCatalog } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import getAiAccess from "../connection/get-ai-access.js";

/** Lists the configured agents and what each can do, for the admin. */
const getDefinitions: ServiceFn<
	[{ authUser: LucidAuth }],
	AgentCatalog
> = async (context, input) => {
	const aiAccess = await getAiAccess(context, {});
	if (aiAccess.error) return aiAccess;

	return {
		error: undefined,
		data: agentFormatter.formatDefinitions({
			config: context.config,
			aiAccess: aiAccess.data,
			authUser: input.authUser,
			adminTranslations: context.translate
				.forLocale(context.config.i18n.defaultLocale)
				.adminBundle(),
		}),
	};
};

export default getDefinitions;
