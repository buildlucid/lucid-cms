import T from "@/translations";
import { type Component, type JSX, createMemo } from "solid-js";
import classnames from "classnames";
import { A } from "@solidjs/router";
import spawnToast from "@/utils/spawn-toast";

interface LinkProps extends JSX.HTMLAttributes<HTMLAnchorElement> {
	theme: "primary" | "container-outline" | "danger" | "basic";
	size: "x-small" | "small" | "medium" | "large" | "x-icon" | "icon" | "auto";
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
			"flex items-center justify-center text-center focus:outline-hidden focus:ring-1 duration-200 transition-colors rounded-md relative font-base",
			{
				"bg-primary-base hover:bg-primary-hover text-primary-contrast hover:text-primary-contrast fill-primary-contrast ring-primary-base":
					props.theme === "primary",
				"bg-container-1 border border-primary-base hover:bg-primary-hover fill-primary-contrast text-title hover:text-primary-contrast":
					props.theme === "container-outline",
				"bg-error-base hover:bg-error-hover text-error-contrast ring-primary-base fill-error-contrast":
					props.theme === "danger",
				// Sizes
				"px-2.5 h-9 text-sm": props.size === "x-small",
				"px-5 py-2.5 h-10 text-sm": props.size === "small",
				"px-5 py-3.5 text-sm": props.size === "medium",
				"px-10 py-4 text-sm": props.size === "large",
				"w-9 h-9 p-0 min-w-[36px]!": props.size === "x-icon",
				"w-10 h-10 p-0 min-w-[40px]!": props.size === "icon",
				"p-1": props.size === "auto",
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
