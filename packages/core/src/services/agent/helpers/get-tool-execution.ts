import type { Checkpoint, ToolCall } from "../../../libs/agent/types.js";
import type {
	AgentToolAuthority,
	AgentToolExecution,
} from "../../../libs/tools/types.js";
import type { SessionRun } from "./run-session.js";

/** Builds tool execution context with the run's authority and write attribution. */
const getToolExecution = (props: {
	run: SessionRun;
	authority: AgentToolAuthority;
	call: ToolCall;
	checkpoint: Pick<Checkpoint, "screen">;
	signal: AbortSignal;
}): AgentToolExecution => ({
	authority: props.authority,
	actor: { ...props.authority.principal, agentRunId: props.run.id },
	signal: props.signal,
	operationId: `${props.run.id}:${props.call.id}`,
	run: {
		id: props.run.id,
		conversationId: props.run.conversation_id,
		agentKey: props.run.agent_key,
	},
	screen: props.checkpoint.screen,
});

export default getToolExecution;
