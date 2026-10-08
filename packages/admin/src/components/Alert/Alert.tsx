import classnames from "classnames";
import {
	TbOutlineAlertTriangle,
	TbOutlineCheck,
	TbOutlineExclamationMark,
	TbOutlineInfoSmall,
} from "solid-icons/tb";
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
						<TbOutlineCheck size={8} />
					</Match>
					<Match when={variant() === "danger"}>
						<TbOutlineExclamationMark size={8} />
					</Match>
					<Match when={variant() === "warning"}>
						<TbOutlineAlertTriangle size={8} />
					</Match>
					<Match when={variant() === "info"}>
						{/* InfoSmall is half the height of other glyphs, so double the size and halve the stroke */}
						<TbOutlineInfoSmall size={16} stroke-width={1} />
					</Match>
				</Switch>
			</span>
			<div class="min-w-0 flex-1 text-sm text-current">{props.children}</div>
		</div>
	);
};

export default Alert;
