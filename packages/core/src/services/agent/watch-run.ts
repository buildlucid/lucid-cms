import constants from "../../constants/constants.js";
import formatter, { agentFormatter } from "../../libs/formatters/index.js";
import {
	AgentMessagesRepository,
	AgentRunsRepository,
} from "../../libs/repositories/index.js";
import type { AgentStreamEvent } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";

const wait = (ms: number, signal: AbortSignal) =>
	new Promise<void>((resolve) => {
		const timer = setTimeout(resolve, ms);
		signal.addEventListener(
			"abort",
			() => {
				clearTimeout(timer);
				resolve();
			},
			{ once: true },
		);
	});

/**
 * Streams a run's saved replies while a background worker executes it. Ends once
 * the run stops working, or after one slice so the client reconnects.
 */
const watchRun: ServiceFn<
	[
		{
			runId: string;
			signal: AbortSignal;
			emit: (event: AgentStreamEvent) => Promise<void>;
		},
	],
	undefined
> = async (context, input) => {
	const AgentRuns = new AgentRunsRepository(context.db);
	const AgentMessages = new AgentMessagesRepository(context.db);
	const deadline = Date.now() + constants.agent.sliceMs;
	const sent = new Map<string, string>();
	let since: string | undefined;

	while (!input.signal.aborted && Date.now() < deadline) {
		// Status is read first so the final reply is always sent before finish.
		const run = await AgentRuns.selectSingle({
			select: ["status"],
			where: [{ key: "id", operator: "=", value: input.runId }],
		});
		if (run.error) return run;
		if (!run.data) break;

		const messages = await AgentMessages.selectChangedForRun({
			runId: input.runId,
			since,
		});
		if (messages.error) return messages;

		for (const message of messages.data) {
			const updatedAt = formatter.formatDate(message.updated_at);
			if (sent.get(message.id) === updatedAt) continue;

			sent.set(message.id, updatedAt);
			if (since === undefined || updatedAt > since) since = updatedAt;
			await input.emit({
				type: "message",
				message: agentFormatter.formatMessage({ message }),
			});
		}

		const status = run.data.status;
		if (!constants.agent.runStatuses.working.some((s) => s === status)) {
			await input.emit({ type: "finish", runId: input.runId, status });
			break;
		}

		await wait(constants.agent.watchIntervalMs, input.signal);
	}

	return { error: undefined, data: undefined };
};

export default watchRun;
