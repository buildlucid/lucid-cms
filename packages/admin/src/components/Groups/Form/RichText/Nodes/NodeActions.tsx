import { FaSolidPen } from "solid-icons/fa";
import { type Component, Show } from "solid-js";
import Button from "@/components/Partials/Button";
import NodeRemoveButton from "./NodeRemoveButton";

interface NodeActionsProps {
	editLabel: string;
	removeLabel: string;
	editDisabled: boolean;
	showRemove: boolean;
	onEdit: (event: MouseEvent) => void;
	onRemove: () => void;
}

const NodeActions: Component<NodeActionsProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			class="pointer-events-none flex shrink-0 flex-col items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
			data-lucid-rich-text-node-actions=""
		>
			<Button
				type="button"
				theme="secondary-subtle"
				size="icon-subtle"
				classes="rounded-full!"
				onClick={props.onEdit}
				disabled={props.editDisabled}
				aria-label={props.editLabel}
				title={props.editLabel}
			>
				<FaSolidPen size={12} />
			</Button>
			<Show when={props.showRemove}>
				<NodeRemoveButton label={props.removeLabel} onRemove={props.onRemove} />
			</Show>
		</div>
	);
};

export default NodeActions;
