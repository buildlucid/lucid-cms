import { HoverCard } from "@kobalte/core";
import classnames from "classnames";
import { TbOutlineInfoSmall } from "solid-icons/tb";
import { type Component, Show } from "solid-js";

interface TooltipProps {
	copy?: string;
	theme?: "basic" | "full" | "inline";
	/** `ghost` shows only the icon, without a border or background. @default "default" */
	variant?: "default" | "ghost";
}

export const FormTooltip: Component<TooltipProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Show when={props.copy}>
			<HoverCard.Root>
				<HoverCard.Trigger
					class={classnames(
						"h-5 w-5 shrink-0 cursor-help rounded-full flex items-center justify-center duration-200 transition-colors",
						props.variant === "ghost"
							? "text-muted hover:text-subtitle"
							: "border border-border bg-input text-subtitle hover:bg-card",
						{
							"absolute top-1/2 -translate-y-1/2 right-2":
								props.theme === "full",
							"absolute top-0 right-0": props.theme === "basic",
						},
					)}
				>
					{/* InfoSmall only fills the middle of its 24px box, so crop to the glyph to draw it legibly */}
					<TbOutlineInfoSmall
						size={12}
						viewBox="6 6.5 12 12"
						stroke-width={2}
					/>
				</HoverCard.Trigger>
				<HoverCard.Portal>
					<HoverCard.Content class="z-70 bg-card w-72 max-w-[calc(100vw-2rem)] mt-1.5 rounded-md px-3 py-2 border border-border shadow-xs">
						<p class="text-sm text-body">{props.copy}</p>
					</HoverCard.Content>
				</HoverCard.Portal>
			</HoverCard.Root>
		</Show>
	);
};
