import type { Component } from "solid-js";
import brickPlaceholder from "@assets/images/brick-placeholder.jpg";
import { Image } from "@kobalte/core";
import AspectRatio from "@/components/Partials/AspectRatio";
import classNames from "classnames";

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
				<Image.Fallback class="">
					<img
						src={brickPlaceholder}
						class="w-full h-full object-cover"
						alt="Brick Placeholder"
						loading="lazy"
					/>
				</Image.Fallback>
			</Image.Root>
		</AspectRatio>
	);
};

export default BrickPreview;
