import { A, type AnchorProps } from "@solidjs/router";
import classnames from "classnames";
import {
	type Component,
	createMemo,
	type JSX,
	mergeProps,
	splitProps,
} from "solid-js";
import { getButtonClasses } from "@/components/Button/classes";
import {
	checkPermission,
	type PermissionRequirement,
	showNoPermissionToast,
} from "@/utils/permission-requirement";

export type LinkVariant =
	| "primary"
	| "secondary"
	| "outline"
	| "danger"
	| "danger-outline"
	| "ghost";

export type LinkSize = "xs" | "sm" | "md" | "lg";

export type LinkShape = "standard" | "square" | "circle";

export interface LinkProps extends Omit<AnchorProps, "href" | "shape"> {
	/** @default "primary" */
	variant?: LinkVariant;
	/** @default "md" */
	size?: LinkSize;
	/** `square` and `circle` have equal width and height, for icon links. @default "standard" */
	shape?: LinkShape;
	/**
	 * Permission keys the user needs, or a boolean when access is checked
	 * elsewhere. Without permission, clicking shows a toast instead.
	 */
	permission?: PermissionRequirement;
	href?: string;
	children: JSX.Element;
}

/**
 * A link styled as a button, with optional permission handling.
 *
 * @example
 * ```tsx
 * import { Link } from "@lucidcms/admin/components";
 * import { Permissions, useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<Link href="/admin/media" permission={Permissions.MediaRead}>
 * 		{t("routes.media.title")}
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
	const linkOnClick: JSX.EventHandler<HTMLAnchorElement, MouseEvent> = (e) => {
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
		<A
			{...rest}
			data-link
			class={classnames(classes(), local.class)}
			href={local.href || ""}
			onClick={linkOnClick}
		>
			{local.children}
		</A>
	);
};

export default Link;
