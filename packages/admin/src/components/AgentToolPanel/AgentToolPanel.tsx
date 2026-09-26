import classnames from "classnames";
import { FaSolidXmark } from "solid-icons/fa";
import { type Component, createMemo, Show } from "solid-js";
import { toolLabel } from "@/components/AgentMessage/parts/AgentToolCall";
import JSONPreview from "@/components/JSONPreview/JSONPreview";
import Pill, { type PillVariant } from "@/components/Pill/Pill";
import T from "@/translations";
import type { AgentToolPart } from "@/utils/agent-chat";

/** Shows a tool call's input and output as they arrive. */
const AgentToolPanel: Component<{
	part: AgentToolPart;
	onClose: () => void;
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const status = createMemo((): { label: string; variant: PillVariant } => {
		switch (props.part.status) {
			case "pending":
				return { label: T()("agent.tool.status.pending"), variant: "neutral" };
			case "running":
				return {
					label: T()("agent.tool.status.running"),
					variant: "info-subtle",
				};
			case "complete":
				return {
					label: T()("agent.tool.status.complete"),
					variant: "success-subtle",
				};
			case "failed":
				return {
					label: T()("agent.tool.status.failed"),
					variant: "danger-subtle",
				};
			case "skipped":
				return { label: T()("agent.tool.status.skipped"), variant: "neutral" };
		}
	});

	// ----------------------------------------
	// Render
	return (
		<aside
			aria-label={toolLabel(props.part)}
			class={classnames(
				"flex-col gap-5 rounded-xl border border-border bg-card p-4 shadow-lg animate-slide-from-right-in md:p-5",
				props.class,
			)}
		>
			<div class="flex flex-col gap-2">
				<div class="flex items-start justify-between gap-2">
					<h3 class="wrap-break-words text-sm font-medium text-title">
						{toolLabel(props.part)}
					</h3>
					<button
						type="button"
						class="-mt-0.5 -mr-1 flex size-6 shrink-0 items-center justify-center rounded-md text-icon transition-colors hover:text-icon-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
						aria-label={T()("common.close")}
						title={T()("common.close")}
						onClick={() => props.onClose()}
					>
						<FaSolidXmark size={12} />
					</button>
				</div>
				<div class="flex flex-wrap items-center gap-2">
					<Pill size="xs" variant={status().variant}>
						{status().label}
					</Pill>
					<code class="rounded bg-input px-1.5 py-0.5 text-[11px] text-body">
						{props.part.name}
					</code>
				</div>
			</div>
			<section class="flex flex-col gap-2">
				<h4 class="text-xs font-medium text-subtitle">
					{T()("agent.tool.input")}
				</h4>
				<JSONPreview json={props.part.input} />
			</section>
			<section class="flex flex-col gap-2">
				<h4 class="text-xs font-medium text-subtitle">
					{T()("agent.tool.output")}
				</h4>
				<Show
					when={props.part.output !== undefined}
					fallback={
						<p class="text-sm text-muted">
							{T()(
								props.part.status === "pending" ||
									props.part.status === "running"
									? "agent.tool.output.waiting"
									: "agent.tool.output.none",
							)}
						</p>
					}
				>
					<JSONPreview json={props.part.output} />
				</Show>
			</section>
		</aside>
	);
};

export default AgentToolPanel;
