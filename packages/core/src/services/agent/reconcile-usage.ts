import z from "zod";
import { getLucidRemoteClient } from "../../libs/lucid-remote/client.js";
import { cmsAiUsageSchema } from "../../libs/lucid-remote/schema/ai.js";
import { AiGenerationsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";
import {
	formatDbTimestamp,
	parseStoredTimestamp,
} from "../ai/helpers/date-helpers.js";
import handleProtectedResourceUnauthorized from "../connection/helpers/handle-protected-resource-unauthorized.js";
import getAccessToken from "../connection/token-manager.js";
import storeUsage from "./helpers/store-usage.js";

const remoteStatusSchema = z.object({
	data: z.object({
		requestId: z.string(),
		status: z.enum(["processing", "complete", "failed", "cancelled"]),
		usage: cmsAiUsageSchema.optional(),
	}),
});

const batchSize = 50;
const minimumAgeMs = 2 * 60_000;
const missingRequestAgeMs = 20 * 60_000;

/** Recover a failed stream immediately or scan older requests after disconnects. */
const reconcileUsage: ServiceFn<[{ requestId?: string }?], number> = async (
	context,
	input,
) => {
	const token = await getAccessToken(context, {});
	if (token.error) {
		if (token.error.key === "connection_not_connected") {
			return { error: undefined, data: 0 };
		}

		return token;
	}

	const repository = new AiGenerationsRepository(context.db);

	const pending = await repository.pendingAgentUsage({
		connectionId: token.data.lucidRemoteConnectionId,
		before: input?.requestId
			? undefined
			: formatDbTimestamp(new Date(Date.now() - minimumAgeMs)),
		requestId: input?.requestId,
		limit: input?.requestId ? 1 : batchSize,
	});
	if (pending.error) return pending;

	const client = getLucidRemoteClient(context);
	let settled = 0;

	for (const row of pending.data ?? []) {
		if (
			row.user_id === null ||
			row.agent_run_id === null ||
			row.agent_conversation_id === null ||
			row.lucid_remote_connection_id === null
		) {
			continue;
		}

		const response = await client.request<unknown>(
			`/v1/cms/ai/agent/${encodeURIComponent(row.request_id)}`,
			{
				method: "GET",
				headers: { Authorization: `Bearer ${token.data.accessToken}` },
				retries: 0,
				signal: AbortSignal.timeout(10_000),
			},
		);
		if (response.error?.status === 401) {
			await handleProtectedResourceUnauthorized(context);
		}
		if (response.error && response.error.status !== 404) return response;

		const ageMs = Date.now() - parseStoredTimestamp(row.created_at).getTime();

		if (response.error?.status === 404 && ageMs < missingRequestAgeMs) continue;

		const status = response.error
			? undefined
			: remoteStatusSchema.safeParse(response.data.json);

		if (status && !status.success) continue;
		if (status?.success && status.data.data.requestId !== row.request_id) {
			continue;
		}

		const usage = status?.success ? status.data.data.usage : undefined;

		if (usage) {
			const stored = await storeUsage(context, {
				requestId: row.request_id,
				purpose: row.feature_key === "agent.compact" ? "compact" : undefined,
				runId: row.agent_run_id,
				conversationId: row.agent_conversation_id,
				userId: row.user_id,
				connectionId: row.lucid_remote_connection_id,
				usage,
				durationMs: null,
			});
			if (stored.error) return stored;

			settled++;
			continue;
		}
		//* failed and cancelled turns were never charged
		const uncharged =
			status?.success &&
			(status.data.data.status === "failed" ||
				status.data.data.status === "cancelled");
		if (response.error?.status !== 404 && !uncharged) continue;

		const failed = await repository.upsertAgentUsage({
			data: {
				request_id: row.request_id,
				provider_request_id: null,
				feature_key: row.feature_key,
				feature_version: "v1",
				user_id: row.user_id,
				lucid_remote_connection_id: row.lucid_remote_connection_id,
				agent_conversation_id: row.agent_conversation_id,
				agent_run_id: row.agent_run_id,
				target_type: "agent-run",
				target: {
					conversationId: row.agent_conversation_id,
					runId: row.agent_run_id,
				},
				output: null,
				usage: null,
				model: null,
				credits_charged: null,
				duration_ms: null,
				status: "failed",
				error_message: context.translate("server:agent.usage.missing"),
			},
		});
		if (failed.error) return failed;

		settled++;
	}

	return { error: undefined, data: settled };
};

export default reconcileUsage;
