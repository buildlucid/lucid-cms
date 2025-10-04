import type { Component, JSXElement } from "solid-js";
import classNames from "classnames";

export const Wrapper: Component<{
	slots?: {
		topBar?: JSXElement;
		header?: JSXElement;
		footer?: JSXElement;
	};
	class?: string;
	children?: JSXElement;
}> = (props) => {
	return (
		<div class="flex flex-col min-h-[calc(100vh-15px)] border-t border-x border-border rounded-t-xl overflow-x-hidden">
			{props.slots?.topBar}
			{props.slots?.header}
			<div
				class={classNames(
					"flex grow flex-col justify-between bg-background-base",
					props.class,
				)}
			>
				{props.children}
			</div>
			{props.slots?.footer}
		</div>
	);
};
