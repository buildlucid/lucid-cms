import type { AgentRunOutcome, AgentRunStatus as Status } from "@types";
import { type Component, createMemo } from "solid-js";
import Pill, { type PillSize } from "@/components/Pill/Pill";
import { getAgentRunDisplay } from "@/utils/agent-chat";

const AgentRunStatus: Component<{
	status: Status;
	outcome?: AgentRunOutcome | null;
	size?: PillSize;
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const display = createMemo(() =>
		getAgentRunDisplay(props.status, props.outcome),
	);

	// ----------------------------------------
	// Render
	return (
		<Pill
			size={props.size ?? "xs"}
			variant={display().variant}
			class={props.class}
		>
			{display().label}
		</Pill>
	);
};

export default AgentRunStatus;
