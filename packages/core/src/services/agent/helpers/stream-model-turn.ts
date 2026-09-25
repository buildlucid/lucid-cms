import { EventSourceParserStream } from "eventsource-parser/stream";
import packageJson from "../../../../package.json" with { type: "json" };
import constants from "../../../constants/constants.js";
import {
	type ModelEvent,
	type ModelMessage,
	modelEventSchema,
} from "../../../libs/agent/types.js";
import formatter from "../../../libs/formatters/index.js";
import { copy } from "../../../libs/i18n/index.js";
import { createRemoteError } from "../../../libs/lucid-remote/client.js";
import { getLucidRemoteConfigFromEnv } from "../../../libs/lucid-remote/origin.js";
import { getBaseUrl } from "../../../utils/helpers/index.js";
import type {
	ServiceFn,
	ServiceResponse,
} from "../../../utils/services/types.js";
import handleProtectedResourceUnauthorized from "../../connection/helpers/handle-protected-resource-unauthorized.js";
import getAccessToken from "../../connection/token-manager.js";

/** One billed model turn. CMS tools never execute on the remote service. */
const streamModelTurn: ServiceFn<
	[
		{
			requestId: string;
			instructions: string;
			messages: ModelMessage[];
			tools: {
				name: string;
				description: string;
				inputSchema: Record<string, unknown>;
			}[];
			signal: AbortSignal;
			onRequest?: (connectionId: number) => ServiceResponse<undefined>;
			emit: (event: ModelEvent) => Promise<void>;
		},
	],
	{
		usage: Extract<ModelEvent, { type: "finish" }>["usage"];
		connectionId: number;
	}
> = async (context, input) => {
	const token = await getAccessToken(context, {});
	if (token.error) return token;
	if (input.onRequest) {
		const pending = await input.onRequest(token.data.lucidRemoteConnectionId);
		if (pending.error) return pending;
	}

	try {
		const response = await fetch(
			new URL(
				"/v1/cms/ai/agent",
				getLucidRemoteConfigFromEnv(context.env).issuer,
			),
			{
				method: "POST",
				redirect: "error",
				signal: input.signal,
				headers: {
					Authorization: `Bearer ${token.data.accessToken}`,
					"Content-Type": "application/json",
					Accept: "text/event-stream",
					Origin: getBaseUrl(context),
					"User-Agent": `LucidCMS/${packageJson.version}`,
					"Idempotency-Key": input.requestId,
				},
				body: JSON.stringify({
					requestId: input.requestId,
					instructions: input.instructions,
					messages: input.messages,
					tools: input.tools,
				}),
			},
		);
		if (!response.ok) {
			if (response.status === 401) {
				await handleProtectedResourceUnauthorized(context);
			}

			return createRemoteError(
				response,
				await response.json().catch(() => undefined),
			);
		}
		if (
			!response.body ||
			!response.headers.get("content-type")?.includes("text/event-stream")
		) {
			return {
				data: undefined,
				error: {
					type: "basic",
					status: 502,
					message: copy("server:agent.stream.missing"),
				},
			};
		}

		const reader = response.body
			.pipeThrough(new TextDecoderStream())
			.pipeThrough(
				new EventSourceParserStream({
					onError: "terminate",
					maxBufferSize: constants.agent.limits.partsChars,
				}),
			)
			.getReader();
		let finish: Extract<ModelEvent, { type: "finish" }> | undefined;

		try {
			while (true) {
				const chunk = await reader.read();
				if (chunk.done) break;

				const parsed = modelEventSchema.safeParse(
					formatter.parseJSON(chunk.value.data),
				);

				if (!parsed.success) {
					return {
						data: undefined,
						error: {
							type: "basic",
							status: 502,
							message: copy("server:agent.stream.invalid"),
						},
					};
				}

				const event = parsed.data;

				if (event.type === "error") {
					return {
						data: undefined,
						error: {
							type: "basic",
							status: 502,
							message: copy("server:agent.model.failed"),
							key: "agent_model_failed",
							cause: new Error(event.message),
						},
					};
				}
				if (event.type === "finish") {
					if (event.requestId !== input.requestId) {
						return {
							data: undefined,
							error: {
								type: "basic",
								status: 502,
								message: copy("server:agent.stream.request.mismatch"),
							},
						};
					}

					finish = event;
				}

				await input.emit(event);

				if (event.type === "finish") break;
			}
		} finally {
			await reader.cancel().catch(() => undefined);
			reader.releaseLock();
		}

		if (!finish) {
			return {
				data: undefined,
				error: {
					type: "basic",
					status: 502,
					message: copy("server:agent.stream.incomplete"),
				},
			};
		}

		return {
			error: undefined,
			data: {
				usage: finish.usage,
				connectionId: token.data.lucidRemoteConnectionId,
			},
		};
	} catch (error) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 502,
				message: copy(
					input.signal.aborted
						? "server:agent.run.interrupted"
						: "server:agent.connection.failed",
				),
				cause: error,
			},
		};
	}
};
export default streamModelTurn;
