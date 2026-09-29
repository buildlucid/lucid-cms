import classnames from "classnames";
import { FaSolidEye, FaSolidEyeSlash, FaSolidXmark } from "solid-icons/fa";
import { type Component, createMemo, Show } from "solid-js";
import T from "@/translations";
import {
	type AgentReferenceItem,
	agentReferenceTilt,
} from "@/utils/agent-references";
import {
	referenceRemoveClasses,
	referenceRemoveIdleClasses,
} from "../remove-classes";
import AgentReferenceThumb from "./AgentReferenceThumb";

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
			class="agent-reference-file group relative w-24 rounded-lg border border-border bg-card p-1 shadow-sm"
			style={{ "--agent-reference-tilt": tilt() }}
			title={props.reference.label}
		>
			<span
				class="block h-14 overflow-hidden rounded-md transition-opacity"
				classList={{ "opacity-50": props.readable === false }}
			>
				<AgentReferenceThumb reference={props.reference} />
			</span>
			<span class="flex items-center gap-1 px-0.5 pt-1">
				<span class="min-w-0 flex-1 truncate text-[11px] text-title">
					{props.reference.label}
				</span>
				<Show when={props.readable !== undefined}>
					<span
						class="flex shrink-0"
						classList={{
							"text-subtitle fill-subtitle": props.readable,
							"text-muted fill-muted": !props.readable,
						}}
						role="img"
						aria-label={readableLabel()}
						title={readableLabel()}
					>
						<Show when={props.readable} fallback={<FaSolidEyeSlash size={9} />}>
							<FaSolidEye size={9} />
						</Show>
					</span>
				</Show>
			</span>
			<Show when={props.onRemove}>
				{(remove) => (
					<button
						type="button"
						class={classnames(
							referenceRemoveClasses,
							referenceRemoveIdleClasses,
							"start-1.5 top-1.5",
						)}
						aria-label={T()("agent.references.remove", {
							label: props.reference.label,
						})}
						onClick={() => remove()()}
					>
						<FaSolidXmark size={9} />
					</button>
				)}
			</Show>
		</div>
	);
};

export default AgentReferenceFile;
