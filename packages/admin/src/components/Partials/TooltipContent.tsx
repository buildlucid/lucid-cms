import type { Component } from "solid-js";
import { Tooltip } from "@kobalte/core";

interface TooltipContentProps {
	text: string;
}

const TooltipContent: Component<TooltipContentProps> = (props) => {
	return (
		<Tooltip.Content class="bg-primary-base text-primary-contrast rounded-md text-sm px-2 py-1 shadow-md animate-animate-from-left z-50">
			<Tooltip.Arrow class="text-primary-base" size={20} />
			{props.text}
		</Tooltip.Content>
	);
};

export default TooltipContent;
