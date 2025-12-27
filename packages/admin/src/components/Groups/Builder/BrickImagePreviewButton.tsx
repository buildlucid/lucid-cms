import type { CollectionBrickConfig } from "@types";
import { FaSolidInfo } from "solid-icons/fa";
import { type Component, Show } from "solid-js";
import brickStore from "@/store/brickStore";
import helpers from "@/utils/helpers";

interface BrickImagePreviewButtonProps {
	brickConfig?: CollectionBrickConfig;
}

export const BrickImagePreviewButton: Component<
	BrickImagePreviewButtonProps
> = (props) => {
	// ------------------------------
	// Render
	return (
		<Show when={props.brickConfig?.preview?.image}>
			<button
				type="button"
				tabIndex="-1"
				class={
					"text-2xl text-icon-faded hover:text-icon-hover transition-all duration-200"
				}
				onClick={(e) => {
					e.stopPropagation();
					brickStore.set("imagePreview", {
						open: true,
						data: {
							title: helpers.getLocaleValue({
								value: props.brickConfig?.details.name,
								fallback: props.brickConfig?.key,
							}),
							description: helpers.getLocaleValue({
								value: props.brickConfig?.details.summary,
								fallback: props.brickConfig?.key,
							}),
							image: props.brickConfig?.preview?.image,
						},
					});
				}}
			>
				<FaSolidInfo size={14} />
			</button>
		</Show>
	);
};
