import { FaSolidXmark } from "solid-icons/fa";
import type { Component } from "solid-js";
import Button from "@/components/Button/Button";

interface NodeRemoveButtonProps {
	label: string;
	onRemove: () => void;
}

const NodeRemoveButton: Component<NodeRemoveButtonProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Button
			type="button"
			theme="danger-subtle"
			size="icon-subtle"
			class="rounded-full!"
			onClick={(event) => {
				event.preventDefault();
				event.stopPropagation();
				props.onRemove();
			}}
			aria-label={props.label}
			title={props.label}
			data-lucid-rich-text-node-remove=""
		>
			<FaSolidXmark size={12} />
		</Button>
	);
};

export default NodeRemoveButton;
