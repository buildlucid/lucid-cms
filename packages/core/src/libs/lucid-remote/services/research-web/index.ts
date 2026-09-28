import { setTimeout } from "node:timers/promises";
import z from "zod";
import type { ServiceFn } from "../../../../utils/services/types.js";
import { copy } from "../../../i18n/index.js";
import { getLucidRemoteClient } from "../../client.js";
import { lucidRemotePaths } from "../../constants.js";
import {
	type WebRequest,
	type WebResponse,
	webResponseSchema,
} from "../../schema/web.js";

/** Runs a paid web operation with a stable identity for safe replay. */
const researchWeb: ServiceFn<
	[
		{
			accessToken: string;
			requestId: string;
			request: WebRequest;
			signal: AbortSignal;
		},
	],
	WebResponse
> = async (context, input) => {
	const client = getLucidRemoteClient(context);
	const auth = {
		accessToken: input.accessToken,
		headers: { "idempotency-key": input.requestId },
	};

	let response = await client.request<unknown>(lucidRemotePaths.generateCmsAi, {
		method: "POST",
		...auth,
		body: input.request,
		retries: 0,
		signal: input.signal,
	});

	// A restarted runner can arrive while the original paid call is still finishing.
	// Poll the stored request; never start another supplier request to recover it.
	const deadline = Date.now() + 75_000;
	while (
		response.error?.key === "cms_ai_request_in_progress" &&
		Date.now() < deadline &&
		!input.signal.aborted
	) {
		await setTimeout(1000, undefined, { signal: input.signal }).catch(
			() => undefined,
		);
		response = await client.request<unknown>(
			`${lucidRemotePaths.getCmsAiRequest}/${input.requestId}`,
			{
				method: "GET",
				...auth,
				retries: 0,
				signal: input.signal,
			},
		);
	}
	if (response.error) return response;

	const parsed = z
		.object({ data: webResponseSchema })
		.safeParse(response.data.json);
	if (
		!parsed.success ||
		parsed.data.data.feature.key !== input.request.feature.key ||
		parsed.data.data.usage.operation !==
			(input.request.feature.key === "web.search" ? "search" : "fetch")
	) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 502,
				message: copy("server:core.ai.remote.web.failed.message"),
			},
		};
	}

	return { data: parsed.data.data, error: undefined };
};

export default researchWeb;
