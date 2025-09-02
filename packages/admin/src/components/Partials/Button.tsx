import T from "@/translations";
import { type Component, Show, type JSX, createMemo } from "solid-js";
import classnames from "classnames";
import spawnToast from "@/utils/spawn-toast";

interface ButtonProps extends JSX.HTMLAttributes<HTMLButtonElement> {
	theme:
		| "primary"
		| "secondary"
		| "container-outline"
		| "border-outline"
		| "danger"
		| "basic"
		| "secondary-toggle"
		| "input-style"
		| "danger-outline";
	size: "x-small" | "small" | "medium" | "large" | "x-icon" | "icon" | "auto";
	children: JSX.Element;

	onClick?: () => void;
	type?: "button" | "submit" | "reset";
	classes?: string;
	loading?: boolean;
	disabled?: boolean;
	active?: boolean;
	permission?: boolean;
}

const Button: Component<ButtonProps> = (props) => {
	// ----------------------------------------
	// Memos
	const classes = createMemo(() => {
		return classnames(
			"flex items-center justify-center min-w-max text-center focus:outline-none outline-none focus:ring-1 duration-200 transition-colors rounded-md relative disabled:cursor-not-allowed disabled:opacity-80 font-base",
			{
				"bg-primary-base hover:bg-primary-hover text-primary-contrast fill-primary-contrast ring-primary-base":
					props.theme === "primary",
				"bg-secondary-base hover:bg-secondary-hover text-secondary-contrast fill-secondary-contrast ring-primary-base":
					props.theme === "secondary",
				"bg-transparent border border-primary-base hover:bg-primary-hover fill-primary-contrast text-title hover:text-primary-contrast ring-primary-base":
					props.theme === "container-outline",
				"bg-transparent border border-border hover:border-transparent hover:bg-primary-hover fill-primary-contrast text-title hover:text-primary-contrast ring-primary-base":
					props.theme === "border-outline",
				"bg-error-base hover:bg-error-hover text-error-contrast ring-primary-base fill-error-contrast":
					props.theme === "danger",
				"bg-container-4 hover:bg-container-5 text-title ring-primary-base fill-title border border-border-input":
					props.theme === "input-style",
				"bg-transparent border border-border hover:bg-error-hover ring-primary-base fill-error-contrast hover:text-error-contrast":
					props.theme === "danger-outline",

				// Toggles
				"ring-primary-base": props.theme === "secondary-toggle",
				"bg-transparent text-body fill-body hover:bg-primary-hover hover:text-primary-contrast hover:fill-primary-contrast border-border border":
					props.theme === "secondary-toggle" && !props.active,
				"bg-primary-base text-primary-contrast fill-primary-contrast hover:bg-primary-hover border-primary-base border":
					props.theme === "secondary-toggle" && props.active,

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
	// Functions
	const buttonOnClick = (e: MouseEvent) => {
		if (props.permission === false) {
			spawnToast({
				title: T()("no_permission_toast_title"),
				message: T()("no_permission_toast_message"),
				status: "warning",
			});
			e.preventDefault();
			e.stopPropagation();
			return;
		}

		props.onClick?.();
	};

	// ----------------------------------------
	// Render
	return (
		<button
			{...props}
			type={props.type}
			class={classnames(classes(), props.classes)}
			onClick={buttonOnClick}
			disabled={props.disabled || props.loading}
		>
			<Show when={props.loading !== undefined && props.loading}>
				<div
					class={classnames(
						"flex items-center justify-center absolute inset-0 z-10 rounded-md",
						{
							"bg-primary-base/40":
								props.theme === "primary" ||
								props.theme === "container-outline" ||
								props.theme === "border-outline",
							"bg-secondary-base/40": props.theme === "secondary",
							"bg-error-base/40": props.theme === "danger",
							"bg-container-4/40": props.theme === "input-style",
						},
					)}
				>
					<div class="w-4 h-4 border-2 border-white rounded-full animate-spin" />
				</div>
			</Show>
			{props.children}
		</button>
	);
};

export default Button;
