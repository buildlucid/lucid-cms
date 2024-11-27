import type { Component, JSXElement } from "solid-js";
import classNames from "classnames";

interface InputGridProps {
	columns: number;
	margin?: string;
	children: JSXElement;
}

const InputGrid: Component<InputGridProps> = (props) => {
	return (
		<div
			class={classNames("grid gap-5", {
				"mb-30 laste:mb-0": props.margin === undefined,
				"mb-5 last:mb-0": props.margin === "sm",
				"md:grid-cols-2": props.columns === 2,
				"md:grid-cols-2 lg:grid-cols-3": props.columns === 3,
				"md:grid-cols-2 lg:grid-cols-4": props.columns === 4,
			})}
		>
			{props.children}
		</div>
	);
};

export default InputGrid;
