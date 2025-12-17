import type { Component } from "solid-js";
import { Image as KImage } from "@kobalte/core";
import classNames from "classnames";

interface ImageProps {
	src: string;
	alt?: string;
	loading?: "lazy" | "eager";
	classes?: string;
	fit?: "cover" | "contain";
}

const Image: Component<ImageProps> = (props) => {
	// ----------------------------------
	// Return
	return (
		<KImage.Root>
			<KImage.Img
				class={classNames(
					"block w-full h-full",
					props.fit === "contain" ? "object-contain" : "object-cover",
					props.classes,
				)}
				src={props.src}
				loading={props.loading}
				alt={props.alt}
				decoding="async"
				onDragStart={(e) => e.preventDefault()}
			/>
			<KImage.Fallback
				class={classNames("bg-input-base w-full h-full block", props.classes)}
			/>
		</KImage.Root>
	);
};

export default Image;
