import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

export type AspectRatioValue = "1:1" | "4:3" | "16:9" | "21:9";

export interface AspectRatioProps {
	ratio: AspectRatioValue;
	/** Applied to the element that holds the children. */
	contentClass?: string;
	class?: string;
	children?: JSXElement;
}

/**
 * Keeps its content at a fixed aspect ratio as the width changes.
 *
 * @example
 * ```tsx
 * import { AspectRatio, Image } from "@lucidcms/admin/components";
 *
 * return (
 * 	<AspectRatio ratio="16:9" contentClass="overflow-hidden rounded-md">
 * 		<Image src={preview.url} alt={preview.alt} />
 * 	</AspectRatio>
 * );
 * ```
 */
const AspectRatio: Component<AspectRatioProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			data-aspect-ratio
			class={classNames(
				"relative w-full after:block",
				{
					"after:pb-[100%]": props.ratio === "1:1",
					"after:pb-[75%]": props.ratio === "4:3",
					"after:pb-[56.25%]": props.ratio === "16:9",
					"after:pb-[42.85%]": props.ratio === "21:9",
				},
				props.class,
			)}
		>
			<div
				data-aspect-ratio-content
				class={classNames("absolute inset-0", props.contentClass)}
			>
				{props.children}
			</div>
		</div>
	);
};

export default AspectRatio;
