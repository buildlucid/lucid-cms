import { type Component, Show } from "solid-js";

interface DescribedByProps {
	id?: string;
	describedBy?: string;
}

export const DescribedBy: Component<DescribedByProps> = (props) => {
	return (
		<Show when={props?.describedBy}>
			<div
				id={`${props.id}-description`}
				class="text-sm mt-2 border-l-4 border-primary-base/40 pl-2"
			>
				{props?.describedBy}
			</div>
		</Show>
	);
};
