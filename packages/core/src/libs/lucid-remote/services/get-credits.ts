import z from "zod";
import type { AiCredits } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import { copy } from "../../i18n/index.js";
import { getLucidRemoteClient } from "../client.js";
import { lucidRemotePaths } from "../constants.js";

//* balances can include fractions of a credit held for requests in progress
const credits = z
	.string()
	.regex(/^(0|[1-9]\d*)(\.\d+)?$/)
	.transform(Number);

const responseSchema = z.object({
	data: z.object({
		available: credits,
		allowance: z
			.object({
				total: credits,
				used: credits,
				remaining: credits,
				resetsAt: z.string(),
			})
			.nullable(),
		additional: z.object({ remaining: credits }),
		connectionCap: z
			.object({
				limit: credits,
				used: credits,
				remaining: credits,
				resetsAt: z.string(),
			})
			.nullable(),
	}),
}) satisfies z.ZodType<{ data: AiCredits }, unknown>;

const getCredits: ServiceFn<[{ accessToken: string }], AiCredits> = async (
	context,
	input,
) => {
	const result = await getLucidRemoteClient(context).request<unknown>(
		lucidRemotePaths.getCredits,
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
				message: copy("server:core.ai.credits.unavailable"),
			},
		};
	}

	return { data: parsed.data.data, error: undefined };
};

export default getCredits;
