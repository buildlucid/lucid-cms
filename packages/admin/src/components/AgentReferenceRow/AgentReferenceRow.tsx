import { A } from "@solidjs/router";
import type { AgentReference } from "@types";
import classnames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";
import AgentReferenceThumb from "@/components/AgentReferenceThumb/AgentReferenceThumb";
import DeployReferenceStatus from "@/components/DeployReferenceStatus/DeployReferenceStatus";
import { agentReferenceHref } from "@/utils/agent-references";

/** Shows reference previews. Links resources to their pages; media uses `onSelect`. */
const AgentReferenceRow: Component<{
	reference: AgentReference;
	details: JSXElement;
	onSelect?: () => void;
	class?: string;
	/** An overlay at the row's end, such as a remove button, with room reserved through `class`. */
	end?: JSXElement;
}> = (props) => {
	// ----------------------------------------
	// Functions
	const classes = () =>
		classnames(
			"flex min-w-0 items-center gap-2.5 rounded-md py-1.5 ps-1.5 text-start transition-colors hover:bg-card-hover focus-ring",
			props.class,
		);
	const content = () => (
		<>
			<span
				class={classnames(
					"block shrink-0 overflow-hidden border border-border",
					props.reference.type === "media"
						? "size-9 rounded-md"
						: "h-9 w-7 rounded-sm",
				)}
			>
				<AgentReferenceThumb reference={props.reference} />
			</span>
			<span class="min-w-0 flex-1">
				<span class="flex min-w-0 items-center gap-1.5">
					<span class="truncate text-xs text-title">
						{props.reference.label}
					</span>
					<Show when={props.reference.type === "deploy" && props.reference}>
						{(reference) => (
							<DeployReferenceStatus
								deployKey={reference().deployKey}
								part="time"
							/>
						)}
					</Show>
				</span>
				<Show when={props.details}>
					<span class="block truncate text-2xs text-muted">
						{props.details}
					</span>
				</Show>
			</span>
		</>
	);

	// ----------------------------------------
	// Render
	return (
		<li class="group relative">
			<Show
				when={props.reference.type !== "media" && props.reference}
				fallback={
					<button
						type="button"
						class={classnames("w-full", classes())}
						onClick={() => props.onSelect?.()}
					>
						{content()}
					</button>
				}
			>
				{(reference) => (
					<A href={agentReferenceHref(reference())} class={classes()}>
						{content()}
					</A>
				)}
			</Show>
			{props.end}
		</li>
	);
};

export default AgentReferenceRow;
