import T from "@/translations";
import { type Component, createMemo } from "solid-js";
import classNames from "classnames";
import type { MediaResponse } from "@types";
import helpers from "@/utils/helpers";
import AspectRatio from "@/components/Partials/AspectRatio";
import MediaPreview from "@/components/Partials/MediaPreview";

interface MediaBasicCardProps {
	media: MediaResponse;
	current: boolean;
	contentLocale?: string;
	onClick?: () => void;
}

export const MediaBasicCardLoading: Component = () => {
	// ----------------------------------
	// Return
	return (
		<li class={"bg-background-base border-border border rounded-md"}>
			<AspectRatio ratio="16:9">
				<span class="skeleton block w-full h-full rounded-b-none" />
			</AspectRatio>
			<div class="p-2.5">
				<span class="skeleton block h-5 w-1/2 mb-2" />
				<span class="skeleton block h-5 w-full" />
			</div>
		</li>
	);
};

const MediaBasicCard: Component<MediaBasicCardProps> = (props) => {
	// ----------------------------------
	// Memos
	const title = createMemo(() => {
		return helpers.getTranslation(props.media.title, props.contentLocale);
	});
	const alt = createMemo(() => {
		return helpers.getTranslation(props.media.alt, props.contentLocale);
	});

	// ----------------------------------
	// Return
	return (
		<li
			class={classNames(
				"bg-card-base border-border border rounded-md group overflow-hidden relative cursor-pointer",
				{
					"border-primary-base": props.current,
				},
			)}
			onClick={() => {
				props.onClick?.();
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter") {
					props.onClick?.();
				}
			}}
		>
			{/* Image */}
			<AspectRatio ratio="16:9" innerClass={"overflow-hidden"}>
				<MediaPreview media={props.media} alt={alt() || title() || ""} />
			</AspectRatio>
			{/* Content */}
			<div class="p-2 border-t border-border">
				<h3 class="line-clamp-1 text-sm">{title() || T()("no_translation")}</h3>
			</div>
		</li>
	);
};

export default MediaBasicCard;
