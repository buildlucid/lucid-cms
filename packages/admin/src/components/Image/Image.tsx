import { Image as KImage } from "@kobalte/core";
import classNames from "classnames";
import type { Component } from "solid-js";

export type ImageFit = "cover" | "contain";

export interface ImageProps {
	src: string;
	alt?: string;
	/** @default "cover" */
	fit?: ImageFit;
	/** @default "eager" */
	loading?: "lazy" | "eager";
	class?: string;
}

/**
 * An image that fills its container, with a placeholder while it loads.
 *
 * @example
 * ```tsx
 * import { Image } from "@lucidcms/admin/components";
 * import { mediaUrl } from "@lucidcms/admin/utils";
 *
 * return <Image src={mediaUrl(media, "thumbnail-small")} alt={media.alt} loading="lazy" />;
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
