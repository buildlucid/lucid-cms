import z from "zod";
import constants from "../../../constants/constants.js";
import { copy } from "../../../libs/i18n/index.js";
import type { AgentTitleGenerateV1Request } from "../../../libs/lucid-remote/services/generate-cms-ai/type.js";
import { generateCmsAi } from "../../../libs/lucid-remote/services/index.js";
import { isCmsAiGenerateCompletedData } from "../../../libs/lucid-remote/utils.js";
import {
	AgentMessagesRepository,
	AgentRunsRepository,
} from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import storeGeneration from "../../ai/storage/store-generation.js";
import handleProtectedResourceUnauthorized from "../../connection/helpers/handle-protected-resource-unauthorized.js";
import getAccessToken from "../../connection/token-manager.js";

const titleSchema = z.object({ title: z.string().trim().min(1) });

const { titleLength } = constants.agent;

const normalizeTitle = (value: string) => {
	const title = value
		.replace(/\s+/gu, " ")
		.replace(/^["'“”]+|["'“”]+$/gu, "")
		.replace(/[.!?]+$/u, "")
		.trim();
	if (title.length <= titleLength) return title;
	const shortened = title
		.slice(0, titleLength)
		.replace(/\s+\S*$/u, "")
		.trim();
	return shortened || title.slice(0, titleLength);
};

const generationFailed = () =>
	({
		type: "basic",
		status: 502,
		message: copy("server:agent.title.generate.failed"),
	}) as const;

/** Generates a title from saved chat text, with the first message as the focus for new chats. */
const generateTitle: ServiceFn<
	[
		{
			conversationId: string;
			userId: number | null;
			scope: "first-message" | "conversation";
			runId?: string;
			idempotencyKey?: string;
		},
	],
	string
> = async (context, input) => {
	const AgentMessages = new AgentMessagesRepository(context.db);
	const AgentRuns = new AgentRunsRepository(context.db);

	const first = await AgentMessages.selectAfter({
		conversationId: input.conversationId,
		after: 0,
		limit: 1,
	});
	if (first.error) return first;

	const recent =
		input.scope === "conversation"
			? await AgentMessages.selectLatest({
					conversationId: input.conversationId,
					limit: 8,
				})
			: undefined;
	if (recent?.error) return recent;

	const run = input.runId
		? await AgentRuns.selectSingle({
				select: ["summary"],
				where: [{ key: "id", operator: "=", value: input.runId }],
			})
		: undefined;
	if (run?.error) return run;

	const excerpt = [
		first.data[0],
		...(recent?.data
			.toReversed()
			.filter((message) => message.id !== first.data[0]?.id) ?? []),
	]
		.filter((message) => message !== undefined)
		.map((message) => {
			const text = message.parts
				.filter((part) => part.type === "text")
				.map((part) => part.text)
				.join(" ")
				.trim()
				.slice(0, 1_000);
			return text ? `${message.role}: ${text}` : "";
		})
		.filter(Boolean);

	const summary = run?.data?.summary?.trim().slice(0, 1_500);
	const source = [
		...(summary ? [`Completed run summary: ${summary}`] : []),
		...excerpt,
	]
		.join("\n")
		.slice(0, 8_000);
	if (!source) {
		return {
			data: undefined,
			error: {
				type: "basic",
				status: 400,
				message: copy("server:agent.title.context.empty"),
			},
		};
	}

	const token = await getAccessToken(context, {});
	if (token.error) return token;

	const requestStartedAt = Date.now();
	const request: AgentTitleGenerateV1Request = {
		feature: { key: "agent.title.generate", version: "v1" },
		//* groups the title with the chat's other usage on the Lucid side too
		sessionId: input.conversationId,
		input: [{ type: "text", role: "conversation", value: source }],
		context: {},
	};

	const generated = await generateCmsAi(context, {
		accessToken: token.data.accessToken,
		idempotencyKey: input.idempotencyKey,
		request,
	});
	if (generated.error) {
		if (generated.error.status === 401) {
			await handleProtectedResourceUnauthorized(context);
		}
		return generated;
	}

	const result = generated.data.json.data;
	if (!isCmsAiGenerateCompletedData(result)) {
		return { data: undefined, error: generationFailed() };
	}

	const parsed = titleSchema.safeParse(result.output);
	const title = parsed.success ? normalizeTitle(parsed.data.title) : "";
	if (!title) return { data: undefined, error: generationFailed() };

	const stored = await storeGeneration(context, {
		lucidRemoteConnectionId: token.data.lucidRemoteConnectionId,
		userId: input.userId,
		session: { type: "agent", id: input.conversationId },
		response: result,
		requestStartedAt,
	});
	if (stored.error) return stored;

	return { error: undefined, data: title };
};

export default generateTitle;
