import classNames from "classnames";
import {
	type Component,
	createMemo,
	type JSX,
	type JSXElement,
	splitProps,
} from "solid-js";

type PillTheme =
	| "primary"
	| "primary-opaque"
	| "grey"
	| "red"
	| "yellow"
	| "green"
	| "blue"
	| "info-opaque"
	| "purple"
	| "error-opaque"
	| "warning"
	| "warning-opaque"
	| "secondary"
	| "outline";

interface PillBaseProps {
	theme: PillTheme;
	children: JSXElement;
	class?: string;
	tooltip?: string;
}

type PillSpanProps = PillBaseProps &
	Omit<JSX.HTMLAttributes<HTMLSpanElement>, "class" | "children" | "title"> & {
		as?: undefined;
	};

export type PillButtonProps = PillBaseProps &
	Omit<
		JSX.HTMLAttributes<HTMLButtonElement>,
		"class" | "children" | "title"
	> & {
		as: "button";
		disabled?: boolean;
		onClick?: (event: MouseEvent) => void;
		type?: "button" | "submit" | "reset";
	};

export type PillProps = PillSpanProps | PillButtonProps;

const Pill: Component<PillProps> = (props) => {
	const [local, rest] = splitProps(props, [
		"as",
		"theme",
		"children",
		"class",
		"tooltip",
	]);

	// ----------------------------------
	// Memos
	const classes = createMemo(() => {
		return classNames(
			"inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium leading-4 whitespace-nowrap",
			local.as === "button" &&
				"transition-colors duration-200 focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary-base disabled:cursor-not-allowed disabled:opacity-60",
			local.class,
			{
				"bg-primary-base text-primary-contrast": local.theme === "primary",
				"border border-primary-muted-border bg-primary-muted-bg text-primary-base":
					local.theme === "primary-opaque",
				"bg-input-base text-title": local.theme === "grey",
				"bg-error-base text-error-contrast": local.theme === "red",
				"border border-workflow-yellow-border bg-workflow-yellow-bg text-workflow-yellow-text":
					local.theme === "yellow",
				"border border-workflow-green-border bg-workflow-green-bg text-workflow-green-text":
					local.theme === "green",
				"border border-workflow-blue-border bg-workflow-blue-bg text-workflow-blue-text":
					local.theme === "blue",
				"border border-info-base/20 bg-info-base/10 text-info-base":
					local.theme === "info-opaque",
				"border border-workflow-purple-border bg-workflow-purple-bg text-workflow-purple-text":
					local.theme === "purple",
				"border border-error-base/20 bg-error-base/10 text-error-base":
					local.theme === "error-opaque",
				"bg-warning-base text-warning-contrast": local.theme === "warning",
				"border border-warning-base/20 bg-warning-base/10 text-warning-base":
					local.theme === "warning-opaque",
				"bg-secondary-base text-secondary-contrast":
					local.theme === "secondary",
				"border border-border bg-input-base text-body":
					local.theme === "outline",
				"hover:bg-primary-hover":
					local.as === "button" && local.theme === "primary",
				"hover:bg-card-hover hover:text-title":
					local.as === "button" && ["grey", "outline"].includes(local.theme),
				"hover:bg-primary-muted-bg/80":
					local.as === "button" && local.theme === "primary-opaque",
				"hover:bg-error-hover": local.as === "button" && local.theme === "red",
				"hover:bg-secondary-hover":
					local.as === "button" && local.theme === "secondary",
			},
		);
	});

	// ----------------------------------
	// Return
	if (local.as === "button") {
		const buttonProps = rest as Omit<
			PillButtonProps,
			keyof PillBaseProps | "as"
		>;

		return (
			<button
				{...buttonProps}
				type={buttonProps.type ?? "button"}
				class={classes()}
				title={local.tooltip}
			>
				{local.children}
			</button>
		);
	}

	const spanProps = rest as Omit<PillSpanProps, keyof PillBaseProps | "as">;

	return (
		<span {...spanProps} class={classes()} title={local.tooltip}>
			{local.children}
		</span>
	);
};

export default Pill;
