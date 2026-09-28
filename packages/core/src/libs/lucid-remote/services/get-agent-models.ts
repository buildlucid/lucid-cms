import z from "zod";
import type { AiModelCatalog } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { aiReasoningEffortSchema } from "../../agent/model-selection.js";
import { copy } from "../../i18n/index.js";
import { getLucidRemoteClient } from "../client.js";
import { lucidRemotePaths } from "../constants.js";

//* efforts stay open strings here, so a newer Lucid service never breaks an older CMS
const effort = z.string().nullable();
const responseSchema = z.object({
	data: z.object({
		default: z.object({ modelId: z.string(), reasoningEffort: effort }),
		models: z.array(
			z.object({
				id: z.string().min(1),
				name: z.string().min(1),
				description: z.string().default(""),
				inputTokenLimit: z.number().int().positive(),
				toolLimit: z.number().int().positive(),
				reasoningEfforts: z.array(z.string()),
				defaultReasoningEffort: effort,
			}),
		),
	}),
});

const knownEffort = (value: string | null) => {
	const parsed = aiReasoningEffortSchema.safeParse(value);
	return parsed.success ? parsed.data : null;
};

/** Reads the agent model catalogue from the connected Lucid service. */
const getAgentModels: ServiceFn<
	[{ accessToken: string }],
	AiModelCatalog
> = async (context, input) => {
	const result = await getLucidRemoteClient(context).request<unknown>(
		lucidRemotePaths.getAgentModels,
		{
			method: "GET",
			retries: 0,
			accessToken: input.accessToken,
		},
	);
	if (result.error) return result;

	const parsed = responseSchema.safeParse(result.data.json);
	if (!parsed.success) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 502,
				message: copy("server:agent.models.unavailable"),
			},
		};
	}

	const catalog = parsed.data.data;
	return {
		data: {
			default: {
				modelId: catalog.default.modelId,
				reasoningEffort: knownEffort(catalog.default.reasoningEffort),
			},
			models: catalog.models.map((model) => ({
				...model,
				reasoningEfforts: model.reasoningEfforts.flatMap(
					(value) => knownEffort(value) ?? [],
				),
				defaultReasoningEffort: knownEffort(model.defaultReasoningEffort),
			})),
		},
		error: undefined,
	};
};
export default getAgentModels;
