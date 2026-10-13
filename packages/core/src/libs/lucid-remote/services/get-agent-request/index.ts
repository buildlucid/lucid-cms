import z from "zod";
import type { ServiceFn } from "../../../../utils/services/types.js";
import { getLucidRemoteClient } from "../../client.js";
import { lucidRemotePaths } from "../../constants.js";
import { cmsAgentUsageSchema } from "../../schema/ai.js";

const responseSchema = z.object({
	data: z.object({
		requestId: z.string(),
		status: z.enum(["processing", "complete", "failed", "cancelled"]),
		usage: cmsAgentUsageSchema.optional(),
	}),
});

/**
 * Reads status and usage for an agent model turn from the connected Lucid service.
 * @remarks Returns null for invalid response data or a mismatched request ID.
 */
const getAgentRequest: ServiceFn<
	[{ accessToken: string; requestId: string; signal?: AbortSignal }],
	z.infer<typeof responseSchema>["data"] | null
> = async (context, input) => {
	const result = await getLucidRemoteClient(context).request<unknown>(
		`${lucidRemotePaths.agent}/${encodeURIComponent(input.requestId)}`,
		{
			method: "GET",
			accessToken: input.accessToken,
			retries: 0,
			signal: input.signal,
		},
	);
	if (result.error) return result;

	const parsed = responseSchema.safeParse(result.data.json);
	if (!parsed.success || parsed.data.data.requestId !== input.requestId) {
		return { error: undefined, data: null };
	}

	return { error: undefined, data: parsed.data.data };
};

export default getAgentRequest;
