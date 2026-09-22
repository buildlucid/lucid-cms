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
						"bg-background rounded-r-md border-l-4 border-l-danger p-2.5 border border-border mb-5 last:mb-0":
							props.theme === "background", // on background color
						"bg-card rounded-r-md border-l-4 border-l-danger p-2.5 border-border border mb-4 last:mb-0":
							props.theme === "container", // on container color
						"inline-flex min-h-10 items-center gap-2 rounded-md border border-danger-low-border bg-danger-low px-3 py-2":
							props.theme === "inline",
					},
					props.classes,
				)}
			>
				<Show when={props.theme === "inline"}>
					<FaSolidTriangleExclamation
						size={14}
						class="shrink-0 text-danger-low-foreground"
					/>
				</Show>
				<p
					class={classNames("text-sm", {
						"text-danger-hover": props.theme === "basic", // on basic color
						"text-danger-low-foreground": props.theme === "inline",
					})}
				>
					{props.message}
				</p>
			</Alert.Root>
		</Show>
	);
};

export default ErrorMessage;
