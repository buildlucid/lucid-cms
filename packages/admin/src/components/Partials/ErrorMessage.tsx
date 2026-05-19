import { Alert } from "@kobalte/core";
import classNames from "classnames";
import { FaSolidTriangleExclamation } from "solid-icons/fa";
import { type Component, Show } from "solid-js";

interface ErrorMessageProps {
	message?: string;
	theme: "basic" | "background" | "container" | "inline";
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
						"inline-flex min-h-10 items-center gap-2 rounded-md border border-error-base/25 bg-error-base/10 px-3 py-2":
							props.theme === "inline",
					},
					props.classes,
				)}
			>
				<Show when={props.theme === "inline"}>
					<FaSolidTriangleExclamation
						size={14}
						class="shrink-0 text-error-base"
					/>
				</Show>
				<p
					class={classNames("text-sm", {
						"text-error-hover": props.theme === "basic", // on basic color
						"text-error-base": props.theme === "inline",
					})}
				>
					{props.message}
				</p>
			</Alert.Root>
		</Show>
	);
};

export default ErrorMessage;
