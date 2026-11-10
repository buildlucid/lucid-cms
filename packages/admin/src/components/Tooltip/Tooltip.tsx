import { Tooltip as KobalteTooltip } from "@kobalte/core";
import {
	type Component,
	createEffect,
	type JSX,
	Show,
	splitProps,
} from "solid-js";
import Kbd from "@/components/Kbd/Kbd";

export type TooltipPlacement = "top" | "bottom" | "left" | "right";

interface TooltipBaseProps {
	/** What the tooltip says. Nothing shows while it's empty. */
	content: string | undefined;
	/** A keyboard shortcut shown after the text. */
	shortcut?: string;
	/** @default "top" */
	placement?: TooltipPlacement;
}

export type TooltipButtonProps = TooltipBaseProps &
	Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
		as?: "button";
		/** @default "button" */
		type?: "button" | "submit" | "reset";
	};

export type TooltipSpanProps = TooltipBaseProps &
	JSX.HTMLAttributes<HTMLSpanElement> & {
		as: "span";
	};

export type TooltipProps = TooltipButtonProps | TooltipSpanProps;

/**
 * An element with a short hint that shows on hover or keyboard focus. It
 * renders the element itself, a button by default, so it takes the element's
 * own props. A trigger with no text of its own, such as an icon button, is
 * named by the hint. A disabled button falls back to the browser's `title`,
 * so a hint that explains why it's disabled still shows.
 *
 * @example
 * ```tsx
 * import { Tooltip } from "@lucidcms/admin/components";
 * import { useTranslation } from "@lucidcms/admin/hooks";
 *
 * const { t } = useTranslation();
 *
 * return (
 * 	<Tooltip content={t("common.refresh")} shortcut="R" onClick={refresh}>
 * 		<RefreshIcon />
 * 	</Tooltip>
 * );
 * ```
 */
const Tooltip: Component<TooltipProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [local, rest] = splitProps(props, [
		"as",
		"content",
		"shortcut",
		"placement",
		"ref",
	]);
	let trigger: HTMLElement | undefined;

	// ----------------------------------------
	// Functions
	const setTrigger = (element: HTMLElement) => {
		trigger = element;
		if (typeof local.ref === "function") {
			(local.ref as (element: HTMLElement) => void)(element);
		}
	};

	// ----------------------------------------
	// Effects
	//* a trigger with no text of its own, such as an icon button, takes the hint as its name
	createEffect(() => {
		const content = local.content;
		if (!trigger || !content) return;
		if (trigger.hasAttribute("aria-label") && !trigger.dataset.tooltipNamed) {
			return;
		}
		if (trigger.textContent?.trim()) return;
		trigger.dataset.tooltipNamed = "";
		trigger.setAttribute("aria-label", content);
	});

	// ----------------------------------------
	// Render
	const panel = () => (
		<KobalteTooltip.Portal>
			<KobalteTooltip.Content class="tooltip-panel">
				<span>{local.content}</span>
				<Show when={local.shortcut}>
					{(shortcut) => <Kbd variant="inverse">{shortcut()}</Kbd>}
				</Show>
			</KobalteTooltip.Content>
		</KobalteTooltip.Portal>
	);

	if (local.as === "span") {
		const spanProps = rest as Omit<
			TooltipSpanProps,
			keyof TooltipBaseProps | "as" | "ref"
		>;

		return (
			<KobalteTooltip.Root
				openDelay={400}
				closeDelay={0}
				gutter={6}
				placement={local.placement ?? "top"}
				disabled={!local.content}
			>
				<KobalteTooltip.Trigger as="span" {...spanProps} ref={setTrigger} />
				{panel()}
			</KobalteTooltip.Root>
		);
	}

	const buttonProps = rest as Omit<
		TooltipButtonProps,
		keyof TooltipBaseProps | "as" | "ref"
	>;

	return (
		<KobalteTooltip.Root
			openDelay={400}
			closeDelay={0}
			gutter={6}
			placement={local.placement ?? "top"}
			disabled={!local.content}
		>
			<KobalteTooltip.Trigger
				as="button"
				type="button"
				{...buttonProps}
				//* a disabled button gets no pointer events, so the browser's own hint stands in
				title={buttonProps.disabled ? local.content : undefined}
				ref={setTrigger}
			/>
			{panel()}
		</KobalteTooltip.Root>
	);
};

export default Tooltip;
