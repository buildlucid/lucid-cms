import classNames from "classnames";
import { type Component, Show } from "solid-js";

interface DescribedByProps {
	id?: string;
	describedBy?: string;
	class?: string;
}

export const DescribedBy: Component<DescribedByProps> = (props) => {
	return (
		<Show when={props?.describedBy}>
			<div
				id={`${props.id}-description`}
				class={classNames("text-sm mt-1.5 text-unfocused", props.class)}
			>
				{props?.describedBy}
			</div>
		</Show>
	);
};
