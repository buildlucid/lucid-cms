import classnames from "classnames";
import { type Component, createMemo, type JSX, Show } from "solid-js";
import Spinner from "@/components/Partials/Spinner";
import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";

interface ButtonProps extends JSX.HTMLAttributes<HTMLButtonElement> {
	theme:
		| "primary"
		| "secondary"
		| "border-outline"
		| "danger"
		| "basic"
		| "secondary-toggle"
		| "danger-outline";
	size: "small" | "medium" | "icon" | "large";
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
			"flex items-center justify-center min-w-max text-center focus:outline-none outline-none focus-visible:ring-1 duration-200 transition-colors rounded-md relative disabled:cursor-not-allowed disabled:opacity-80 font-base",
			{
				"bg-primary-base hover:bg-primary-hover text-primary-contrast fill-primary-contrast ring-primary-base":
					props.theme === "primary",
				"bg-secondary-base hover:bg-secondary-hover text-secondary-contrast fill-secondary-contrast ring-primary-base":
					props.theme === "secondary",
				"bg-input-base border border-border hover:border-transparent hover:bg-secondary-hover fill-input-contrast text-title hover:text-secondary-contrast ring-primary-base":
					props.theme === "border-outline",
				"bg-error-base hover:bg-error-hover text-error-contrast ring-primary-base fill-error-contrast":
					props.theme === "danger",
				"bg-input-base border border-border hover:bg-error-hover ring-primary-base fill-input-contrast text-title fill-error-contrast hover:text-error-contrast":
					props.theme === "danger-outline",

				// Toggles
				"ring-primary-base": props.theme === "secondary-toggle",
				"bg-input-base border border-border text-input-contrast fill-body hover:bg-secondary-base hover:text-secondary-contrast hover:fill-primary-contrast":
					props.theme === "secondary-toggle" && !props.active,
				"bg-primary-base text-primary-contrast fill-primary-contrast hover:bg-primary-hover border-primary-base border":
					props.theme === "secondary-toggle" && props.active,

				// Sizes
				"px-2 h-9 text-sm": props.size === "small",
				"px-4 py-2 h-10 text-sm": props.size === "medium",
				"px-6 py-3 h-12 text-base": props.size === "large",
				"w-9 h-9 p-0 min-w-[36px]!": props.size === "icon",
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
			class={classnames(classes(), props.classes, {
				"pointer-events-none": props.loading,
			})}
			onClick={buttonOnClick}
			disabled={props.disabled || props.loading}
		>
			<Show when={props.loading !== undefined && props.loading}>
				<div
					class={classnames(
						"flex items-center justify-center absolute inset-0 z-10 rounded-md bg-card-base/50",
					)}
				>
					<Spinner size="sm" />
				</div>
			</Show>
			{props.children}
		</button>
	);
};

export default Button;
