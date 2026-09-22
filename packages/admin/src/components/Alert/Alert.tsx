import classnames from "classnames";
import {
	FaSolidCheck,
	FaSolidExclamation,
	FaSolidInfo,
	FaSolidTriangleExclamation,
} from "solid-icons/fa";
import { type Component, type JSXElement, Match, Switch } from "solid-js";

export type AlertVariant = "info" | "success" | "warning" | "danger";

/**
 * `block` is a card, `bar` spans the full width, and `pill` is a compact
 * floating strip.
 */
export type AlertAppearance = "block" | "bar" | "pill";

export interface AlertProps {
	/** @default "info" */
	variant?: AlertVariant;
	/** @default "block" */
	appearance?: AlertAppearance;
	class?: string;
	children: JSXElement;
}

/**
 * A message with an icon, for information, success, warnings or errors.
 *
 * @example
 * ```tsx
 * import { Alert } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return <Alert variant="warning">{t("sitemap.out.of.date")}</Alert>;
 * ```
 */
const Alert: Component<AlertProps> = (props) => {
	// ----------------------------------------
	// Functions
	const variant = () => props.variant ?? "info";
	const appearance = () => props.appearance ?? "block";
	const filled = () => appearance() !== "block";

	// ----------------------------------------
	// Render
	return (
		<div
			data-alert
			class={classnames(
				"flex items-center border-border",
				{
					"w-full bg-background border rounded-md p-4":
						appearance() === "block",
					"w-full border-b px-4 py-4 md:px-6": appearance() === "bar",
					"rounded-full px-4 py-2 shadow-lg": appearance() === "pill",
					"bg-info text-info-foreground": filled() && variant() === "info",
					"bg-success text-success-foreground":
						filled() && variant() === "success",
					"bg-warning text-warning-foreground":
						filled() && variant() === "warning",
					"bg-danger text-danger-foreground":
						filled() && variant() === "danger",
				},
				props.class,
			)}
		>
			<span
				class={classnames(
					"size-5 flex items-center justify-center rounded-full min-w-5 mr-2",
					{
						"bg-info text-info-foreground": !filled() && variant() === "info",
						"bg-success text-success-foreground":
							!filled() && variant() === "success",
						"bg-warning text-warning-foreground":
							!filled() && variant() === "warning",
						"bg-danger text-danger-foreground":
							!filled() && variant() === "danger",
						"bg-info-foreground text-info": filled() && variant() === "info",
						"bg-success-foreground text-success":
							filled() && variant() === "success",
						"bg-warning-foreground text-warning":
							filled() && variant() === "warning",
						"bg-danger-foreground text-danger":
							filled() && variant() === "danger",
					},
				)}
			>
				<Switch>
					<Match when={variant() === "success"}>
						<FaSolidCheck size={8} />
					</Match>
					<Match when={variant() === "danger"}>
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
