import { type Component, Show } from "solid-js";

interface DescribedByProps {
	id?: string;
	describedBy?: string;
}

export const DescribedBy: Component<DescribedByProps> = (props) => {
	return (
		<Show when={props?.describedBy !== undefined}>
			<div
				id={`${props.id}-description`}
				class="text-sm mt-2.5 border-l-4 border-primary-base pl-2.5"
			>
				{props?.describedBy}
			</div>
		</Show>
	);
};
