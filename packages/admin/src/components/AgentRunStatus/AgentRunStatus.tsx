import type { AgentRunOutcome, AgentRunStatus as Status } from "@types";
import { type Component, createMemo } from "solid-js";
import Pill, { type PillSize, type PillVariant } from "@/components/Pill/Pill";
import T from "@/translations";

/** A run's state in plain words. Finished routine runs show their outcome. */
const AgentRunStatus: Component<{
	status: Status;
	outcome?: AgentRunOutcome | null;
	size?: PillSize;
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const display = createMemo((): { label: string; variant: PillVariant } => {
		switch (props.status) {
			case "queued":
			case "running":
				return { label: T()("agent.status.working"), variant: "info-subtle" };
			case "waiting":
				return {
					label: T()("agent.status.waiting"),
					variant: "warning-subtle",
				};
			case "interrupted":
				return {
					label: T()("agent.status.retrying"),
					variant: "warning-subtle",
				};
			case "failed":
				return { label: T()("agent.status.failed"), variant: "danger-subtle" };
			case "cancelled":
				return { label: T()("agent.status.stopped"), variant: "neutral" };
			case "completed":
				if (props.outcome === "needs_review") {
					return {
						label: T()("agent.status.review"),
						variant: "primary-subtle",
					};
				}
				if (props.outcome === "nothing_to_report") {
					return { label: T()("agent.status.nothing"), variant: "neutral" };
				}
				return {
					label: T()("agent.status.done"),
					variant: "success-subtle",
				};
		}
	});

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
