import { Image } from "@kobalte/core";
import classNames from "classnames";
import { FaSolidImage } from "solid-icons/fa";
import type { Component } from "solid-js";
import AspectRatio from "@/components/Partials/AspectRatio";

interface BrickPreviewProps {
	data: {
		brick?: {
			title: string;
			image?: string;
		};
	};
	options?: {
		rounded?: boolean;
	};
}

const BrickPreview: Component<BrickPreviewProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<AspectRatio ratio="16:9">
			<Image.Root
				fallbackDelay={100}
				class={classNames("w-full h-full overflow-hidden block", {
					"rounded-md": props.options?.rounded,
				})}
			>
				<Image.Img
					src={props.data.brick?.image}
					alt={props.data.brick?.title}
					loading="lazy"
					class="w-full h-full object-cover"
				/>
				<Image.Fallback class="w-full h-full">
					<div class="w-full h-full flex items-center justify-center text-icon-faded">
						<FaSolidImage size={22} />
					</div>
				</Image.Fallback>
			</Image.Root>
		</AspectRatio>
	);
};

export default BrickPreview;
