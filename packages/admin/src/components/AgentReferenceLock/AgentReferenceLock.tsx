import classnames from "classnames";
import { TbOutlineLock } from "solid-icons/tb";
import type { Component } from "solid-js";

const AgentReferenceLock: Component<{
	label: string;
	class: string;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<span
			role="img"
			class={classnames(
				"absolute flex size-5 items-center justify-center rounded border border-border bg-input text-subtitle opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 pointer-coarse:opacity-100",
				props.class,
			)}
			aria-label={props.label}
			title={props.label}
		>
			<TbOutlineLock size={10} />
		</span>
	);
};

export default AgentReferenceLock;
