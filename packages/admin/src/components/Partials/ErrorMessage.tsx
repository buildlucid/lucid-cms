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
						"bg-background-base rounded-r-md border-l-4 border-l-error-base p-2.5 border border-border mb-5 last:mb-0":
							props.theme === "background", // on background color
						"bg-card-base rounded-r-md border-l-4 border-l-error-base p-2.5 border-border border mb-4 last:mb-0":
							props.theme === "container", // on container color
					},
					props.classes,
				)}
			>
				<p
					class={classNames("text-sm", {
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
