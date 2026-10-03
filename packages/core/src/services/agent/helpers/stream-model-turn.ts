import { EventSourceParserStream } from "eventsource-parser/stream";
import packageJson from "../../../../package.json" with { type: "json" };
import constants from "../../../constants/constants.js";
import { instructionVersion } from "../../../libs/agent/instructions/index.js";
import {
	type ModelEvent,
	type ModelMessage,
	type ModelToolDefinition,
	type ModelUsage,
	modelEventSchema,
} from "../../../libs/agent/types.js";
import formatter from "../../../libs/formatters/index.js";
import { copy } from "../../../libs/i18n/index.js";
import { createRemoteError } from "../../../libs/lucid-remote/client.js";
import { lucidRemotePaths } from "../../../libs/lucid-remote/constants.js";
import { getLucidRemoteConfigFromEnv } from "../../../libs/lucid-remote/origin.js";
import type { AiModelSelection } from "../../../types/response.js";
import { getBaseUrl } from "../../../utils/helpers/index.js";
import type {
	ServiceFn,
	ServiceResponse,
} from "../../../utils/services/types.js";
import handleProtectedResourceUnauthorized from "../../connection/helpers/handle-protected-resource-unauthorized.js";
import getAccessToken from "../../connection/token-manager.js";

type FinishEvent = Extract<ModelEvent, { type: "finish" }>;

/** Remote failures the runner handles differently from an ordinary model failure. */
const remoteErrorKeys: Partial<Record<string, string>> = {
	cms_ai_compaction_incomplete: "agent_compaction_failed",
	cms_ai_context_exceeded: "agent_context_exceeded",
};

/** One billed model turn. CMS tools never execute on the remote service. */
const streamModelTurn: ServiceFn<
	[
		{
			requestId: string;
			/** The conversation, so the Lucid service can group usage per chat. */
			sessionId: string;
			/** Resolved when the run starts, so it is only missing if that step was skipped. */
			selection: AiModelSelection | undefined;
			purpose?: "compact";
			instructions: string;
			messages: ModelMessage[];
			tools: ModelToolDefinition[];
			signal: AbortSignal;
			onRequest?: (connectionId: number) => ServiceResponse<undefined>;
			emit: (event: ModelEvent) => Promise<void>;
		},
	],
	{
		usage: ModelUsage;
		connectionId: number;
		reasoningDetails?: FinishEvent["reasoningDetails"];
	}
> = async (context, input) => {
	if (!input.selection) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 500,
				message: copy("server:agent.models.unavailable"),
			},
		};
	}

	const token = await getAccessToken(context, {});
	if (token.error) return token;
	if (input.onRequest) {
		const pending = await input.onRequest(token.data.lucidRemoteConnectionId);
		if (pending.error) return pending;
	}

	try {
		const response = await fetch(
			new URL(
				lucidRemotePaths.agent,
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
					sessionId: input.sessionId,
					selection: input.selection,
					...(input.purpose ? { purpose: input.purpose } : {}),
					instructionVersion,
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
		let finish: FinishEvent | undefined;

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
							key: remoteErrorKeys[event.message] ?? "agent_model_failed",
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
				reasoningDetails: finish.reasoningDetails,
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
