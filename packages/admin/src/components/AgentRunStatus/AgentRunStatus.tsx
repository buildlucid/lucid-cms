import type { AgentRunOutcome, AgentRunStatus as Status } from "@types";
import { type Component, createMemo } from "solid-js";
import Pill, { type PillSize, type PillVariant } from "@/components/Pill/Pill";
import type { StatusIndicatorVariant } from "@/components/StatusIndicator/StatusIndicator";
import T from "@/translations";

/**
 * How a run's state reads to people. `attention` marks states the user needs
 * to act on, so compact lists can call them out and keep the rest quiet.
 */
export const getAgentRunDisplay = (
	status: Status,
	outcome?: AgentRunOutcome | null,
): {
	label: string;
	variant: PillVariant & StatusIndicatorVariant;
	attention: boolean;
} => {
	switch (status) {
		case "queued":
		case "running":
			return {
				label: T()("agent.status.working"),
				variant: "info-subtle",
				attention: false,
			};
		case "waiting":
			return {
				label: T()("agent.status.waiting"),
				variant: "warning-subtle",
				attention: true,
			};
		case "interrupted":
			return {
				label: T()("agent.status.retrying"),
				variant: "warning-subtle",
				attention: false,
			};
		case "failed":
			return {
				label: T()("agent.status.failed"),
				variant: "danger-subtle",
				attention: true,
			};
		case "cancelled":
			return {
				label: T()("agent.status.stopped"),
				variant: "neutral",
				attention: false,
			};
		case "completed":
			if (outcome === "needs_review") {
				return {
					label: T()("agent.status.review"),
					variant: "warning-subtle",
					attention: true,
				};
			}
			if (outcome === "nothing_to_report") {
				return {
					label: T()("agent.status.nothing"),
					variant: "neutral",
					attention: false,
				};
			}
			return {
				label: T()("agent.status.done"),
				variant: "success-subtle",
				attention: false,
			};
	}
};

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
