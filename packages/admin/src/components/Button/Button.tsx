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
	| "ghost"
	| "danger-ghost";

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
	const classes = createMemo(() =>
		getButtonClasses({
			variant: local.variant,
			size: local.size,
			shape: local.shape,
			permitted: access().permitted,
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
				<div class="flex items-center justify-center absolute inset-0 z-10 rounded-md bg-card/50">
					<Spinner size="sm" />
				</div>
			</Show>
			{local.children}
		</button>
	);
};

export default Button;
