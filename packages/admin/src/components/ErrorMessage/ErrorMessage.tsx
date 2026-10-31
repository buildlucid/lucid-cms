import { Alert } from "@kobalte/core";
import classNames from "classnames";
import { TbOutlineAlertTriangle } from "solid-icons/tb";
import { type Component, type JSXElement, Show } from "solid-js";

interface ErrorMessageProps {
	message?: string;
	theme: "basic" | "background" | "container" | "inline";
	/** Shows the warning icon on the inline theme. Defaults to true. */
	icon?: boolean;
	/** Shown at the end of the inline theme, eg. a retry button. */
	action?: JSXElement;
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
						"inline-flex min-h-10 items-center gap-3 rounded-md border border-danger-low-border bg-danger-low px-3 py-2":
							props.theme === "inline",
					},
					props.classes,
				)}
			>
				{/* the icon sits on the first line, so it stays centred on one-line messages */}
				<div class="flex min-w-0 flex-1 items-start gap-2">
					<Show when={props.theme === "inline" && props.icon !== false}>
						<span class="flex h-[1lh] shrink-0 items-center text-sm leading-relaxed">
							<TbOutlineAlertTriangle
								size={14}
								class="text-danger-low-foreground"
							/>
						</span>
					</Show>
					<p
						class={classNames("min-w-0 flex-1 text-sm", {
							"text-danger-hover": props.theme === "basic", // on basic color
							"text-danger-low-foreground": props.theme === "inline",
						})}
					>
						{props.message}
					</p>
				</div>
				<Show when={props.theme === "inline" && props.action}>
					<div class="-my-1.5 shrink-0">{props.action}</div>
				</Show>
			</Alert.Root>
		</Show>
	);
};

export default ErrorMessage;
