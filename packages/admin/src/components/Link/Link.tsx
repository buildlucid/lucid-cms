import { A, type AnchorProps } from "@solidjs/router";
import type { Permission } from "@types";
import classnames from "classnames";
import {
	type Component,
	createMemo,
	type JSX,
	mergeProps,
	splitProps,
} from "solid-js";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";

export type LinkVariant =
	| "primary"
	| "secondary"
	| "outline"
	| "primary-outline"
	| "danger"
	| "danger-outline";

export type LinkSize = "xs" | "sm" | "md" | "lg";

export type LinkShape = "standard" | "square" | "circle";

export interface LinkProps extends Omit<AnchorProps, "href" | "shape"> {
	/** Visual style of the link. @default "primary" */
	variant?: LinkVariant;
	/** Height and text scale of the link. @default "md" */
	size?: LinkSize;
	/** Standard links size to their content, square and circle links are equal width and height. @default "standard" */
	shape?: LinkShape;
	/** Permission(s) the current user must hold. When any are missing, clicks are swallowed and a no permission toast naming them is shown. Undefined means no permission is required. */
	permission?: Permission | Permission[];
	href?: string;
	children: JSX.Element;
}

/**
 * A router anchor styled to match {@link Button}, sharing its variant, size,
 * shape and permission props.
 *
 * @example
 * ```tsx
 * import { Link } from "@lucidcms/admin/components";
 * import { Permissions } from "@lucidcms/admin/hooks";
 *
 * return (
 * 	<Link
 * 		variant="primary"
 * 		size="md"
 * 		shape="standard"
 * 		permission={Permissions.MediaRead}
 * 		href="/lucid/media"
 * 	>
 * 		Browse media
 * 	</Link>
 * );
 * ```
 */
const Link: Component<LinkProps> = (props) => {
	// ----------------------------------------
	// Props
	const merged = mergeProps(
		{
			variant: "primary" as LinkVariant,
			size: "md" as LinkSize,
			shape: "standard" as LinkShape,
		},
		props,
	);
	const [local, rest] = splitProps(merged, [
		"variant",
		"size",
		"shape",
		"permission",
		"class",
		"children",
		"href",
		"onClick",
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
			"flex items-center justify-center text-center focus:outline-hidden focus-visible:ring-1 duration-200 transition-colors rounded-md relative",
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
				"bg-transparent border border-border hover:bg-error-hover ring-primary-base fill-error-contrast hover:text-error-contrast":
					local.variant === "danger-outline",

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
	const linkOnClick: JSX.EventHandler<HTMLAnchorElement, MouseEvent> = (e) => {
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
		<A
			{...rest}
			class={classnames(classes(), local.class)}
			href={local.href || ""}
			onClick={linkOnClick}
		>
			{local.children}
		</A>
	);
};

export default Link;
