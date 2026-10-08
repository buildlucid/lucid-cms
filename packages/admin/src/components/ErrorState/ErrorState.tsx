import classnames from "classnames";
import { type Component, type JSXElement, Show } from "solid-js";
import HaloIcon from "@/components/HaloIcon/HaloIcon";
import T from "@/translations";

export interface ErrorStateProps {
	/** An icon shown on a dotted halo above the title. */
	icon?: JSXElement;
	/** @default "Something went wrong" */
	title?: string;
	description?: string;
	actions?: JSXElement;
	class?: string;
}

/** Displays an error message with an optional icon and recovery actions. */
const ErrorState: Component<ErrorStateProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			data-error-state
			class={classnames("flex items-center justify-center", props.class)}
		>
			<div class="w-full max-w-xl px-4 py-8 text-center flex flex-col items-center md:px-6 md:py-10">
				<Show when={props.icon}>
					<HaloIcon class="mb-4">{props.icon}</HaloIcon>
				</Show>
				<h2 class="mb-1 text-sm font-semibold">
					{props.title ?? T()("errors.generic.title")}
				</h2>
				<p class="max-w-96 text-sm">
					{props.description ?? T()("errors.generic.message")}
				</p>
				<Show when={props.actions}>
					<div class="mt-4 flex items-center gap-2">{props.actions}</div>
				</Show>
			</div>
		</div>
	);
};

export default ErrorState;
