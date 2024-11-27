import type { Component } from "solid-js";
import { Image as KImage } from "@kobalte/core";
import classNames from "classnames";

interface ImageProps {
	src: string;
	alt?: string;
	loading?: "lazy" | "eager";
	classes?: string;
}

const Image: Component<ImageProps> = (props) => {
	// ----------------------------------
	// Return
	return (
		<KImage.Root>
			<KImage.Img
				class={classNames("object-cover block w-full h-full", props.classes)}
				src={props.src}
				loading={props.loading}
				alt={props.alt}
				decoding="async"
			/>
			<KImage.Fallback
				class={classNames("bg-container-4 w-full h-full block", props.classes)}
			/>
		</KImage.Root>
	);
};

export default Image;
