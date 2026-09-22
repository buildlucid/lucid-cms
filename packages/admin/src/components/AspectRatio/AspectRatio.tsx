import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

export type AspectRatioValue = "1:1" | "4:3" | "16:9" | "21:9";

export interface AspectRatioProps {
	ratio: AspectRatioValue;
	/** Put on the box the children fill, for overflow and backgrounds. */
	innerClass?: string;
	class?: string;
	/** Leave it out to hold the space open on its own. */
	children?: JSXElement;
}

/**
 * Holds a fixed shape whatever its width, so images and previews do not shift
 * the layout as they load. The children are stretched to fill it, and it works
 * with none at all as a placeholder.
 *
 * @example
 * ```tsx
 * import { AspectRatio } from "@lucidcms/admin/components";
 *
 * return (
 * 	<AspectRatio ratio="16:9" innerClass="overflow-hidden rounded-md">
 * 		<img src={preview} alt="" class="h-full w-full object-cover" />
 * 	</AspectRatio>
 * );
 * ```
 */
const AspectRatio: Component<AspectRatioProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		//* the pseudo element's padding holds the height open before anything loads
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
				class={classNames("absolute inset-0", props.innerClass)}
			>
				{props.children}
			</div>
		</div>
	);
};

export default AspectRatio;
