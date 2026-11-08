import { randomUUID } from "node:crypto";
import { isSubagentOutstanding } from "../../../../libs/agent/subagents.js";
import type { Checkpoint } from "../../../../libs/agent/types.js";
import { agentFormatter } from "../../../../libs/formatters/index.js";
import { AgentConversationsRepository } from "../../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import { subagentWaitToolName } from "../../tools/subagent-wait/constants.js";
import type { RunSetup } from "../resolve-run-setup.js";
import type { RunSession, SessionRun } from "../run-session.js";
import toolCallPart from "../tool-call-part.js";

/**
 * Adds a wait when a reply ends with sub-agent results outstanding, so the parent resumes with
 * them.
 * @returns Whether a wait was added. Requires the wait tool.
 */
const addSubagentWait: ServiceFn<
	[
		{
			run: SessionRun;
			checkpoint: Checkpoint;
			session: RunSession;
			setup: RunSetup;
		},
	],
	boolean
> = async (context, { run, checkpoint, session, setup }) => {
	if (!setup.presentation.has(subagentWaitToolName)) {
		return { error: undefined, data: false };
	}

	const Conversations = new AgentConversationsRepository(context.db);

	const subagents = await Conversations.selectSubagents(run.conversation_id);
	if (subagents.error) return subagents;
	if (!subagents.data.some(isSubagentOutstanding)) {
		return { error: undefined, data: false };
	}

	//* the wait tool picks every sub-agent the parent hasn't heard from when none are named
	const call = { id: randomUUID(), name: subagentWaitToolName, input: {} };
	const part = toolCallPart(call, setup);
	checkpoint.calls.push(call);
	checkpoint.parts.push(part);
	//* the call joins the model's reply, so later turns see that it waited
	const reply = checkpoint.messages.at(-1);
	if (reply?.role === "assistant") reply.toolCalls = checkpoint.calls;

	const saved = await session.save();
	if (saved.error) return saved;

	await session.emit({
		messageId: checkpoint.messageId,
		...agentFormatter.formatTool({ part, detailsAvailable: false }),
	});

	return { error: undefined, data: true };
};

export default addSubagentWait;
