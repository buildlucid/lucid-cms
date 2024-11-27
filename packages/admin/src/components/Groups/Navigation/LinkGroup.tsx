import type { Component, JSX } from "solid-js";

interface LinkGroupProps {
	title: string;
	children: JSX.Element;
}

export const LinkGroup: Component<LinkGroupProps> = (props) => {
	return (
		<div class="px-15 mb-15 last:mb-0">
			<span class="mb-2.5 block text-sm text-unfocused font-light">
				{props.title}
			</span>
			<ul>{props.children}</ul>
		</div>
	);
};
