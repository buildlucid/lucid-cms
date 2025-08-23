import { type Component, Show } from "solid-js";
import classNames from "classnames";
import { Alert } from "@kobalte/core";

interface ErrorMessageProps {
	message?: string;
	theme: "basic" | "background" | "container";
	classes?: string;
}

const ErrorMessage: Component<ErrorMessageProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Show when={props.message}>
			<Alert.Root
				class={classNames(
					"",
					{
						"bg-container-1 rounded-r-md border-l-4 border-l-error-base p-2.5 border border-border mb-5 last:mb-0":
							props.theme === "background", // on background color
						"bg-container-4/40 rounded-r-md border-l-4 border-l-error-base p-2.5 border-border border mb-15 last:mb-0":
							props.theme === "container", // on container color
					},
					props.classes,
				)}
			>
				<p
					class={classNames({
						"text-error-hover": props.theme === "basic", // on basic color
					})}
				>
					{props.message}
				</p>
			</Alert.Root>
		</Show>
	);
};

export default ErrorMessage;
