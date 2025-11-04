import T from "@/translations";
import { type Component, type JSX, createMemo } from "solid-js";
import classnames from "classnames";
import { A } from "@solidjs/router";
import spawnToast from "@/utils/spawn-toast";

interface LinkProps extends JSX.HTMLAttributes<HTMLAnchorElement> {
	theme:
		| "primary"
		| "secondary"
		| "border-outline"
		| "danger"
		| "basic"
		| "secondary-toggle"
		| "danger-outline";
	size: "small" | "medium" | "icon";
	children: JSX.Element;

	replace?: boolean;
	href?: string;
	classes?: string;
	permission?: boolean;
	target?: string;
}

const Link: Component<LinkProps> = (props) => {
	// ----------------------------------------
	// Memos
	const classes = createMemo(() => {
		return classnames(
			"flex items-center justify-center text-center focus:outline-hidden focus-visible:ring-1 duration-200 transition-colors rounded-md relative font-base",
			{
				"bg-primary-base hover:bg-primary-hover text-primary-contrast fill-primary-contrast ring-primary-base":
					props.theme === "primary",
				"bg-secondary-base hover:bg-secondary-hover text-secondary-contrast fill-secondary-contrast ring-primary-base":
					props.theme === "secondary",
				"bg-input-base border border-border hover:border-transparent hover:bg-secondary-hover fill-input-contrast text-title hover:text-secondary-contrast ring-primary-base":
					props.theme === "border-outline",
				"bg-error-base hover:bg-error-hover text-error-contrast ring-primary-base fill-error-contrast":
					props.theme === "danger",
				"bg-transparent border border-border hover:bg-error-hover ring-primary-base fill-error-contrast hover:text-error-contrast":
					props.theme === "danger-outline",

				// Sizes
				"px-2 h-9 text-sm": props.size === "small",
				"px-4 py-2 h-10 text-sm": props.size === "medium",
				"w-9 h-9 p-0 min-w-[36px]!": props.size === "icon",
				"opacity-80 cursor-not-allowed": props.permission === false,
			},
		);
	});

	// ----------------------------------------
	// Render
	return (
		<A
			class={classnames(classes(), props.classes)}
			href={props.href || ""}
			replace={props.replace}
			{...props}
			onClick={(e) => {
				if (props.permission === false) {
					spawnToast({
						title: T()("no_permission_toast_title"),
						message: T()("no_permission_toast_message"),
						status: "warning",
					});
					e.preventDefault();
					e.stopPropagation();
				}
			}}
		>
			{props.children}
		</A>
	);
};

export default Link;
