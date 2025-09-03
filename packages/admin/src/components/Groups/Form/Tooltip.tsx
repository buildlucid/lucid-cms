import { type Component, Show } from "solid-js";
import classnames from "classnames";
import { FaSolidInfo } from "solid-icons/fa";
import { HoverCard } from "@kobalte/core";

interface TooltipProps {
	copy?: string;
	theme?: "basic" | "full";
}

export const Tooltip: Component<TooltipProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Show when={props.copy}>
			<HoverCard.Root>
				<HoverCard.Trigger
					class={classnames(
						"h-4 w-4 cursor-help hover:bg-primary-base absolute bg-primary-base rounded-full fill-primary-contrast flex items-center justify-center duration-200 transition-colors",
						{
							"top-1/2 -translate-y-1/2 right-2.5": props.theme === "full",
							"top-0 right-0": props.theme === "basic",
						},
					)}
				>
					<FaSolidInfo size={10} />
				</HoverCard.Trigger>
				<HoverCard.Portal>
					<HoverCard.Content class="z-50 bg-primary-base w-80 mt-2.5 rounded-md p-4 border border-primary-hover shadow-xs">
						<p class="text-sm text-primary-contrast">{props.copy}</p>
					</HoverCard.Content>
				</HoverCard.Portal>
			</HoverCard.Root>
		</Show>
	);
};
