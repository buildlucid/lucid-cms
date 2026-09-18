import type { Permission } from "@types";
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
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";

export type ButtonVariant =
	| "primary"
	| "secondary"
	| "outline"
	| "primary-outline"
	| "danger"
	| "danger-outline"
	| "secondary-subtle"
	| "danger-subtle"
	| "ghost"
	| "toggle"
	| "toggle-active";

export type ButtonSize = "xs" | "sm" | "md" | "lg";

export type ButtonShape = "standard" | "square" | "circle";

export interface ButtonProps
	extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
	/** Visual style of the button. @default "primary" */
	variant?: ButtonVariant;
	/** Height and text scale of the button. @default "md" */
	size?: ButtonSize;
	/** Standard buttons size to their content, square and circle buttons are equal width and height. @default "standard" */
	shape?: ButtonShape;
	/** Overlays a spinner and blocks interaction. */
	loading?: boolean;
	/** Permission(s) the current user must hold. When any are missing, clicks are swallowed and a no permission toast naming them is shown. Undefined means no permission is required. */
	permission?: Permission | Permission[];
	children: JSX.Element;
}

/**
 * A button with variant, size and shape styling, plus optional loading and
 * permission handling.
 *
 * @example
 * ```tsx
 * import { Button } from "@lucidcms/admin/components";
 * import { Permissions } from "@lucidcms/admin/hooks";
 *
 * return (
 * 	<Button
 * 		variant="primary"
 * 		size="md"
 * 		shape="standard"
 * 		loading={save.isPending}
 * 		permission={Permissions.MediaCreate}
 * 		onClick={() => save()}
 * 	>
 * 		Save
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
	const missingPermissions = createMemo(() => {
		if (local.permission === undefined) return [];
		const required = Array.isArray(local.permission)
			? local.permission
			: [local.permission];
		return required.filter((p) => !userStore.get.hasPermission([p]).all);
	});
	const hasPermission = createMemo(() => missingPermissions().length === 0);
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
				"border border-border bg-input-base text-body fill-body ring-primary-base hover:border-primary-muted-border hover:bg-card-hover hover:text-primary-base hover:fill-primary-base":
					local.variant === "primary-outline",
				"bg-error-base hover:bg-error-hover text-error-contrast ring-primary-base fill-error-contrast":
					local.variant === "danger",
				"bg-input-base border border-border hover:bg-error-hover ring-primary-base fill-input-contrast text-subtitle fill-error-contrast hover:text-error-contrast":
					local.variant === "danger-outline",
				"text-icon-faded fill-icon-faded hover:text-subtitle hover:fill-subtitle hover:bg-background-base/50 ring-primary-base":
					local.variant === "secondary-subtle",
				"text-icon-faded fill-icon-faded hover:text-error-base hover:fill-error-base hover:bg-error-base/10 ring-primary-base":
					local.variant === "danger-subtle",
				"text-subtitle": local.variant === "ghost",

				// Toggles
				"ring-primary-base":
					local.variant === "toggle" || local.variant === "toggle-active",
				"bg-input-base border border-border text-input-contrast fill-body hover:bg-secondary-base hover:text-secondary-contrast hover:fill-secondary-contrast":
					local.variant === "toggle",
				"bg-primary-base text-primary-contrast fill-primary-contrast hover:bg-primary-hover border-primary-base border":
					local.variant === "toggle-active",

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

				"opacity-80 cursor-not-allowed": !hasPermission(),
			},
		);
	});

	// ----------------------------------------
	// Functions
	const buttonOnClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = (
		e,
	) => {
		if (!hasPermission()) {
			spawnToast({
				title: T()("toasts.common.no.permission.title"),
				message: T()("toasts.common.no.permission.message.detailed", {
					permission: missingPermissions().join(", "),
				}),
				status: "warning",
			});
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
