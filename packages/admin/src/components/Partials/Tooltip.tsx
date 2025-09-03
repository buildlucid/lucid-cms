import { type Component, Show } from "solid-js";
import { FaSolidInfo } from "solid-icons/fa";
import { Tooltip } from "@kobalte/core";

interface TooltipProps {
	copy?: string;
}

const TooltipInfo: Component<TooltipProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Show when={props.copy}>
			<Tooltip.Root placement={"bottom"}>
				<Tooltip.Trigger
					tabIndex={-1}
					class={
						"h-6 w-6 cursor-help hover:bg-primary-base absolute top-4 right-4 bg-primary-base rounded-full text-primary-contrast flex items-center justify-center duration-200 transition-colors"
					}
				>
					<FaSolidInfo size={14} />
				</Tooltip.Trigger>
				<Tooltip.Content class="bg-primary-base text-primary-contrast rounded-md text-sm px-2 py-1 shadow-md animate-animate-from-left">
					<Tooltip.Arrow class="text-primary-base" size={20} />
					{props.copy}
				</Tooltip.Content>
			</Tooltip.Root>
		</Show>
	);
};

export default TooltipInfo;
