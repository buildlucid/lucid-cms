import classnames from "classnames";
import type { Component } from "solid-js";

const PdfBadge: Component<{
	/** @default "sm" */
	size?: "sm" | "md";
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<span
			class={classnames(
				"rounded-sm border border-danger-low-border bg-danger-low font-medium text-danger-low-foreground",
				props.size === "md" ? "px-2.5 py-1 text-sm" : "px-1.5 py-0.5 text-2xs",
			)}
		>
			PDF
		</span>
	);
};

export default PdfBadge;
