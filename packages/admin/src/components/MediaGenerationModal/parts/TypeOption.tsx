import type { MediaGenerationType } from "@types";
import type { IconProps } from "solid-icons";
import { TbOutlinePhoto, TbOutlineVolume } from "solid-icons/tb";
import type { Component } from "solid-js";
import { Dynamic } from "solid-js/web";

const typeIcons = {
	image: TbOutlinePhoto,
	audio: TbOutlineVolume,
} satisfies Record<MediaGenerationType, Component<IconProps>>;

/** A media type with its icon, for the type select's value and options. */
const TypeOption: Component<{
	type: MediaGenerationType;
	label: string;
}> = (props) => {
	// -----------------------------
	// Render
	return (
		<span class="flex min-w-0 items-center gap-2">
			<Dynamic
				component={typeIcons[props.type]}
				size={14}
				class="shrink-0 text-body"
				aria-hidden="true"
			/>
			<span class="truncate">{props.label}</span>
		</span>
	);
};

export default TypeOption;
