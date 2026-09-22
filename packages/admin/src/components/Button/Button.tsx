import classnames from "classnames";
import {
	type Component,
	createMemo,
	type JSX,
	mergeProps,
	Show,
	splitProps,
} from "solid-js";
import Spinner from "@/components/Spinner/Spinner";
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
	| "background-subtle"
	| "danger-subtle"
	| "ghost";

export type ButtonSize = "xs" | "sm" | "md" | "lg";

export type ButtonShape = "standard" | "square" | "circle";

export interface ButtonProps
	extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
	/** @default "primary" */
	variant?: ButtonVariant;
	/** @default "md" */
	size?: ButtonSize;
	/** `square` and `circle` have equal width and height, for icon buttons. @default "standard" */
	shape?: ButtonShape;
	/** Shows a spinner and disables the button. */
	loading?: boolean;
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
		"permission",
		"class",
		"children",
		"onClick",
		"disabled",
	]);

	// ----------------------------------------
	// Memos
	const access = createMemo(() => checkPermission(local.permission));
	const classes = createMemo(() => {
		const square = local.shape !== "standard";

		return classnames(
			"flex items-center justify-center min-w-max text-center focus:outline-none outline-none focus-visible:ring-1 duration-200 transition-colors rounded-md relative disabled:cursor-not-allowed disabled:opacity-80",
			{
				// Variants
				"bg-primary-base hover:bg-primary-hover text-primary-contrast fill-primary-contrast ring-primary-base":
					local.variant === "primary",
				"bg-secondary-base hover:bg-secondary-hover text-secondary-contrast fill-secondary-contrast ring-primary-base":
					local.variant === "secondary",
				"bg-input-base border border-border hover:border-transparent hover:bg-secondary-hover fill-input-contrast text-subtitle hover:text-secondary-contrast ring-primary-base":
					local.variant === "outline",
				"bg-error-base hover:bg-error-hover text-error-contrast ring-primary-base fill-error-contrast":
					local.variant === "danger",
				"bg-input-base border border-border hover:bg-error-hover ring-primary-base fill-input-contrast text-subtitle fill-error-contrast hover:text-error-contrast":
					local.variant === "danger-outline",
				"text-icon-faded fill-icon-faded hover:text-subtitle hover:fill-subtitle hover:bg-background-base/50 ring-primary-base":
					local.variant === "background-subtle",
				"text-icon-faded fill-icon-faded hover:text-error-base hover:fill-error-base hover:bg-error-base/10 ring-primary-base":
					local.variant === "danger-subtle",
				"text-subtitle": local.variant === "ghost",

				// Shape
				"rounded-full!": local.shape === "circle",

				// Sizes
				"px-2 h-7 text-xs": local.size === "xs" && !square,
				"px-3 h-9 text-sm": local.size === "sm" && !square,
				"px-4 py-2 h-10 text-sm": local.size === "md" && !square,
				"px-6 py-3 h-12 text-base": local.size === "lg" && !square,
				"w-7 h-7 p-0 min-w-[28px]!": local.size === "xs" && square,
				"w-9 h-9 p-0 min-w-[36px]!": local.size === "sm" && square,
				"w-10 h-10 p-0 min-w-[40px]!": local.size === "md" && square,
				"w-12 h-12 p-0 min-w-[48px]!": local.size === "lg" && square,

				"opacity-80 cursor-not-allowed": !access().permitted,
			},
		);
	});

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
	return (
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
			<Show when={local.loading}>
				<div class="flex items-center justify-center absolute inset-0 z-10 rounded-md bg-card-base/50">
					<Spinner size="sm" />
				</div>
			</Show>
			{local.children}
		</button>
	);
};

export default Button;
