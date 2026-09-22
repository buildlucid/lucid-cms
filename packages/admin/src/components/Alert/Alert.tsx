import classnames from "classnames";
import {
	FaSolidCheck,
	FaSolidExclamation,
	FaSolidInfo,
	FaSolidTriangleExclamation,
} from "solid-icons/fa";
import { type Component, type JSXElement, Match, Switch } from "solid-js";

/** Info is blue, success is the primary colour, and the rest name themselves. */
export type AlertVariant = "info" | "success" | "warning" | "error";

/**
 * Block sits in the flow as a card, bar spans the full width with a bottom
 * border, and pill is a compact rounded strip for floating over content.
 */
export type AlertAppearance = "block" | "bar" | "pill";

export interface AlertProps {
	/** What the message is telling the reader. @default "info" */
	variant?: AlertVariant;
	/** How the alert sits in its container. @default "block" */
	appearance?: AlertAppearance;
	class?: string;
	children: JSXElement;
}

/**
 * A single message with an icon, for something the reader needs to know about
 * the page they are on. Render it conditionally yourself.
 *
 * @example
 * ```tsx
 * import { Alert } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<Show when={locked()}>
 * 		<Alert variant="warning">{t("documents.locked.message")}</Alert>
 * 	</Show>
 * );
 * ```
 */
const Alert: Component<AlertProps> = (props) => {
	// ----------------------------------------
	// Functions
	const variant = () => props.variant ?? "info";
	const appearance = () => props.appearance ?? "block";
	//* block tints only the icon, the others colour the whole strip
	const filled = () => appearance() !== "block";

	// ----------------------------------------
	// Render
	return (
		<div
			data-alert
			class={classnames(
				"flex items-center border-border",
				{
					"w-full bg-background-base border rounded-md p-4":
						appearance() === "block",
					"w-full border-b px-4 py-4 md:px-6": appearance() === "bar",
					"rounded-full px-4 py-2 shadow-lg": appearance() === "pill",
					"bg-info-base text-info-contrast": filled() && variant() === "info",
					"bg-primary-base text-primary-contrast":
						filled() && variant() === "success",
					"bg-warning-base text-warning-contrast":
						filled() && variant() === "warning",
					"bg-error-base text-error-contrast":
						filled() && variant() === "error",
				},
				props.class,
			)}
		>
			<span
				class={classnames(
					"size-5 flex items-center justify-center rounded-full min-w-5 mr-2",
					{
						"bg-info-base text-info-contrast":
							!filled() && variant() === "info",
						"bg-primary-base text-primary-contrast":
							!filled() && variant() === "success",
						"bg-warning-base text-warning-contrast":
							!filled() && variant() === "warning",
						"bg-error-base text-error-contrast":
							!filled() && variant() === "error",
						"bg-info-contrast text-info-base": filled() && variant() === "info",
						"bg-primary-contrast text-primary-base":
							filled() && variant() === "success",
						"bg-warning-contrast text-warning-base":
							filled() && variant() === "warning",
						"bg-error-contrast text-error-base":
							filled() && variant() === "error",
					},
				)}
			>
				<Switch>
					<Match when={variant() === "success"}>
						<FaSolidCheck size={8} />
					</Match>
					<Match when={variant() === "error"}>
						<FaSolidExclamation size={8} />
					</Match>
					<Match when={variant() === "warning"}>
						<FaSolidTriangleExclamation size={8} />
					</Match>
					<Match when={variant() === "info"}>
						<FaSolidInfo size={8} />
					</Match>
				</Switch>
			</span>
			<p class="text-sm text-current">{props.children}</p>
		</div>
	);
};

export default Alert;
