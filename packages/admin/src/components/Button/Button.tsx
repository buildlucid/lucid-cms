import classnames from "classnames";
import {
	type Component,
	createMemo,
	type JSX,
	mergeProps,
	Show,
	splitProps,
} from "solid-js";
import { getButtonClasses } from "@/components/Button/classes";
import Tooltip from "@/components/Tooltip/Tooltip";
import {
	checkPermission,
	type PermissionRequirement,
	showNoPermissionToast,
} from "@/utils/permission-requirement";

export type ButtonVariant =
	| "primary"
	| "secondary"
	| "outline"
	| "danger"
	| "danger-outline"
	| "ghost"
	| "danger-ghost"
	| "toolbar";

export type ButtonSize = "xs" | "sm" | "md" | "lg";

export type ButtonShape = "standard" | "square" | "circle";

export interface ButtonProps extends Omit<
	JSX.ButtonHTMLAttributes<HTMLButtonElement>,
	"type"
> {
	/** @default "button" */
	type?: "button" | "submit" | "reset";
	/** @default "primary" */
	variant?: ButtonVariant;
	/** @default "md" */
	size?: ButtonSize;
	/** `square` and `circle` have equal width and height, for icon buttons. @default "standard" */
	shape?: ButtonShape;
	/** Pulses an overlay over the button and disables it. */
	loading?: boolean;
	/** A short hint shown on hover or keyboard focus. It also names a button that only holds an icon. */
	tooltip?: string;
	/** A keyboard shortcut shown in the tooltip. */
	shortcut?: string;
	/**
	 * Permission keys the user needs, or a boolean when access is checked
	 * elsewhere. Without permission, clicking shows a toast instead.
	 */
	permission?: PermissionRequirement;
	children: JSX.Element;
}

/**
 * A button, with optional loading and permission states.
 *
 * @example
 * ```tsx
 * import { Button } from "@lucidcms/admin/components";
 * import { Permissions, useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<Button
 * 		loading={save.isPending}
 * 		permission={Permissions.MediaUpdate}
 * 		onClick={() => save.mutate()}
 * 	>
 * 		{t("common.save")}
 * 	</Button>
 * );
 * ```
 */
const Button: Component<ButtonProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const merged = mergeProps(
		{
			variant: "primary" as ButtonVariant,
			size: "md" as ButtonSize,
			shape: "standard" as ButtonShape,
			type: "button" as const,
		},
		props,
	);
	const [local, rest] = splitProps(merged, [
		"variant",
		"size",
		"shape",
		"loading",
		"tooltip",
		"shortcut",
		"permission",
		"class",
		"children",
		"onClick",
		"disabled",
	]);

	// ----------------------------------------
	// Memos
	const access = createMemo(() => checkPermission(local.permission));
	const classes = createMemo(() =>
		getButtonClasses({
			variant: local.variant,
			size: local.size,
			shape: local.shape,
			permitted: access().permitted,
			loading: local.loading,
		}),
	);

	// ----------------------------------------
	// Functions
	const buttonOnClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (
		e,
	) => {
		if (!access().permitted) {
			showNoPermissionToast(access().missing);
			e.preventDefault();
			e.stopPropagation();
			return;
		}

		if (typeof local.onClick === "function") local.onClick(e);
		else if (local.onClick) local.onClick[0](local.onClick[1], e);
	};

	// ----------------------------------------
	// Render
	const content = () => (
		<>
			<Show when={local.loading}>
				<span class="loading-overlay" aria-hidden="true" />
			</Show>
			{local.children}
		</>
	);

	//* a button either has a tooltip or it doesn't, so this is decided once
	if (props.tooltip !== undefined) {
		return (
			<Tooltip
				{...rest}
				content={local.tooltip}
				shortcut={local.shortcut}
				data-button
				class={classnames(classes(), local.class, {
					"pointer-events-none": local.loading,
				})}
				onClick={buttonOnClick}
				disabled={local.disabled || local.loading}
				aria-busy={local.loading ? "true" : undefined}
			>
				{content()}
			</Tooltip>
		);
	}

	return (
		// oxlint-disable-next-line react/button-has-type -- type defaults to "button" through mergeProps
		<button
			{...rest}
			data-button
			class={classnames(classes(), local.class, {
				"pointer-events-none": local.loading,
			})}
			onClick={buttonOnClick}
			disabled={local.disabled || local.loading}
			aria-busy={local.loading ? "true" : undefined}
		>
			{content()}
		</button>
	);
};

export default Button;
