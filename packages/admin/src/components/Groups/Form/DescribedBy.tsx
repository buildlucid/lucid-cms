import { type Component, Show } from "solid-js";

interface DescribedByProps {
	id?: string;
	describedBy?: string;
}

export const DescribedBy: Component<DescribedByProps> = (props) => {
	return (
		<Show when={props?.describedBy}>
			<div id={`${props.id}-description`} class="text-sm mt-1.5 text-unfocused">
				{props?.describedBy}
			</div>
		</Show>
	);
};
