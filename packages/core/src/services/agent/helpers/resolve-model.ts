import constants from "../../../constants/constants.js";
import {
	aiModelCatalogSchema,
	resolveModelSelection,
} from "../../../libs/agent/model-selection.js";
import { getAgent } from "../../../libs/agent/registry.js";
import { copy } from "../../../libs/i18n/index.js";
import cacheKeys from "../../../libs/kv/cache-keys.js";
import logger from "../../../libs/logger/index.js";
import getAgentModels from "../../../libs/lucid-remote/services/get-agent-models.js";
import { AgentRoutinesRepository } from "../../../libs/repositories/index.js";
import type {
	AiModelCatalog,
	AiModelSelection,
} from "../../../types/response.js";
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

/**
 * Resolves the model a run uses, and its context budget, from the agent's
 * settings, the routine's model and the chat's choice.
 */
const resolveModel: ServiceFn<
	[
		{
			agentKey: string;
			routineId?: string | null;
			selection?: AiModelSelection | null;
		},
	],
	NonNullable<ReturnType<typeof resolveModelSelection>>
> = async (context, input) => {
	const catalog = await getModelCatalog(context);
	if (catalog.error) return catalog;

	const routine = input.routineId
		? await new AgentRoutinesRepository(context.db).selectSingle({
				select: ["model_selection"],
				where: [{ key: "id", operator: "=", value: input.routineId }],
			})
		: undefined;
	if (routine?.error) return routine;

	const agent = getAgent(context.config, input.agentKey)?.models;
	const configured = [
		agent?.default?.modelId,
		...(agent?.available ?? []),
		routine?.data?.model_selection?.modelId,
	];

	for (const modelId of new Set(configured)) {
		if (modelId && !catalog.data.models.some((model) => model.id === modelId)) {
			logger.warn({
				message: `Agent "${input.agentKey}" is configured with model "${modelId}", which the Lucid service does not offer. An available model is used instead.`,
				scope: constants.logScopes.ai,
			});
		}
	}

	const resolved = resolveModelSelection({
		catalog: catalog.data,
		agent,
		routine: routine?.data?.model_selection,
		selection: input.selection,
	});
	if (!resolved) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message: copy("server:agent.models.empty"),
			},
		};
	}

	return { data: resolved, error: undefined };
};

export default resolveModel;
