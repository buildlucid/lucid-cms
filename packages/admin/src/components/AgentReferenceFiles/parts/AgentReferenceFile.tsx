import { TbOutlineEye, TbOutlineEyeOff } from "solid-icons/tb";
import { type Component, createMemo, Show } from "solid-js";
import AgentReferenceRemoveButton from "@/components/AgentReferenceRemoveButton/AgentReferenceRemoveButton";
import AgentReferenceThumb from "@/components/AgentReferenceThumb/AgentReferenceThumb";
import T from "@/translations";
import {
	type AgentReferenceItem,
	agentReferenceLabel,
	agentReferenceTilt,
} from "@/utils/agent-references";

/** One attached resource as a small, slightly tilted file card. */
const AgentReferenceFile: Component<{
	reference: AgentReferenceItem;
	/** Whether the agent can open it. Leave out to hide the badge. */
	readable?: boolean;
	onRemove?: () => void;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const tilt = createMemo(() => `${agentReferenceTilt(props.reference)}deg`);
	const label = createMemo(() => agentReferenceLabel(props.reference));
	//* a brick or field also names the document it's in
	const title = createMemo(() =>
		props.reference.type === "document" && props.reference.focus
			? `${props.reference.label} › ${label()}`
			: label(),
	);
	const readableLabel = createMemo(() =>
		T()(
			props.readable
				? "agent.references.readable"
				: "agent.references.not.readable",
		),
	);

	// ----------------------------------------
	// Render
	return (
		<div
			class="agent-reference-file group relative w-24 rounded-lg border border-border bg-card p-1 shadow-raised"
			style={{ "--agent-reference-tilt": tilt() }}
			title={title()}
		>
			<span
				class="block h-14 overflow-hidden rounded-md transition-opacity"
				classList={{ "opacity-50": props.readable === false }}
			>
				<AgentReferenceThumb reference={props.reference} />
			</span>
			<span class="flex items-center gap-1 px-0.5 pt-1">
				<span class="min-w-0 flex-1 truncate text-2xs text-title">
					{label()}
				</span>
				<Show when={props.readable !== undefined}>
					<span
						class="flex shrink-0"
						classList={{
							"text-subtitle": props.readable,
							"text-muted": !props.readable,
						}}
						role="img"
						aria-label={readableLabel()}
						title={readableLabel()}
					>
						<Show when={props.readable} fallback={<TbOutlineEyeOff size={9} />}>
							<TbOutlineEye size={9} />
						</Show>
					</span>
				</Show>
			</span>
			<Show when={props.onRemove}>
				{(remove) => (
					<AgentReferenceRemoveButton
						label={T()("agent.references.remove", {
							label: title(),
						})}
						class="start-1.5 top-1.5"
						onRemove={() => remove()()}
					/>
				)}
			</Show>
		</div>
	);
};

export default AgentReferenceFile;
