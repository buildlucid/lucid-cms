import { type Component, Show } from "solid-js";
import type { CollectionBrickConfig } from "@types";
import brickStore from "@/store/brickStore";
import { FaSolidEye } from "solid-icons/fa";
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
					"text-2xl text-icon-base hover:text-icon-hover transition-all duration-200"
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
				<FaSolidEye size={16} />
			</button>
		</Show>
	);
};
