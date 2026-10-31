import classNames from "classnames";
import type { Component } from "solid-js";
import T from "@/translations";

const OrDivider: Component<{ class?: string }> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<span
			class={classNames(
				"text-center mx-auto flex items-center justify-center gap-2",
				props.class,
			)}
		>
			<span class="w-20 h-px bg-border" />
			<span class="text-body text-sm mx-2.5">{T()("common.or")}</span>
			<span class="w-20 h-px bg-border" />
		</span>
	);
};

export default OrDivider;
