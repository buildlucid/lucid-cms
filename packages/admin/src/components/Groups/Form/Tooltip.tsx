import { HoverCard } from "@kobalte/core";
import classnames from "classnames";
import { FaSolidInfo } from "solid-icons/fa";
import { type Component, Show } from "solid-js";

interface TooltipProps {
	copy?: string;
	theme?: "basic" | "full" | "inline";
}

export const Tooltip: Component<TooltipProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Show when={props.copy}>
			<HoverCard.Root>
				<HoverCard.Trigger
					class={classnames(
						"h-6 w-6 cursor-help border border-border hover:bg-card-base  bg-input-base rounded-full fill-input-contrast flex items-center justify-center duration-200 transition-colors",
						{
							"absolute top-1/2 -translate-y-1/2 right-2":
								props.theme === "full",
							"absolute top-0 right-0": props.theme === "basic",
						},
					)}
				>
					<FaSolidInfo size={10} />
				</HoverCard.Trigger>
				<HoverCard.Portal>
					<HoverCard.Content class="z-50 bg-card-base w-80 mt-2 rounded-md p-3 border border-border shadow-xs">
						<p class="text-sm text-card-contrast">{props.copy}</p>
					</HoverCard.Content>
				</HoverCard.Portal>
			</HoverCard.Root>
		</Show>
	);
};
