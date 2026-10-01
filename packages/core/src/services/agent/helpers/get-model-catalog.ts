import constants from "../../../constants/constants.js";
import { aiModelCatalogSchema } from "../../../libs/agent/model-selection.js";
import cacheKeys from "../../../libs/kv/cache-keys.js";
import getAgentModels from "../../../libs/lucid-remote/services/get-agent-models.js";
import type { AiModelCatalog } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import getAccessToken from "../../connection/token-manager.js";

/** Reads the hosted catalogue, cached briefly so chats and runs rarely wait on it. */
const getModelCatalog: ServiceFn<[], AiModelCatalog> = async (context) => {
	const cached = aiModelCatalogSchema.safeParse(
		await context.kv.get(context, { key: cacheKeys.ai.agentModels }),
	);
	if (cached.success) return { data: cached.data, error: undefined };

	const token = await getAccessToken(context, {});
	if (token.error) return token;
	const catalog = await getAgentModels(context, {
		accessToken: token.data.accessToken,
	});
	if (catalog.error) return catalog;

	await context.kv.set(context, {
		key: cacheKeys.ai.agentModels,
		value: catalog.data,
		ttlSeconds: constants.agent.modelCatalogTtlSeconds,
	});

	return catalog;
};

export default getModelCatalog;
