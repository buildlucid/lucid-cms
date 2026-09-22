import { Image as KImage } from "@kobalte/core";
import classNames from "classnames";
import type { Component } from "solid-js";

export type ImageFit = "cover" | "contain";

export interface ImageProps {
	src: string;
	/** Leave it empty for an image that adds nothing to the page's meaning. */
	alt?: string;
	/** How the image fills its box. @default "cover" */
	fit?: ImageFit;
	/** @default "eager" */
	loading?: "lazy" | "eager";
	class?: string;
}

/**
 * An image that fills its container and leaves a placeholder in its place
 * until it loads. Dragging it is blocked, so it does not interfere with a
 * card's own drag handles.
 *
 * @example
 * ```tsx
 * import { AspectRatio, Image } from "@lucidcms/admin/components";
 *
 * return (
 * 	<AspectRatio ratio="16:9">
 * 		<Image src={media.url} alt={media.alt} fit="contain" loading="lazy" />
 * 	</AspectRatio>
 * );
 * ```
 */
const Image: Component<ImageProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<KImage.Root>
			<KImage.Img
				data-image
				class={classNames(
					"block h-full w-full",
					props.fit === "contain" ? "object-contain" : "object-cover",
					props.class,
				)}
				src={props.src}
				loading={props.loading}
				alt={props.alt}
				decoding="async"
				draggable={false}
				onDragStart={(e) => {
					e.preventDefault();
					e.stopPropagation();
				}}
			/>
			<KImage.Fallback
				data-image-fallback
				class={classNames("block h-full w-full bg-input-base", props.class)}
			/>
		</KImage.Root>
	);
};

export default Image;
