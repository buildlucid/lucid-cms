import { type Component, Switch, Match } from "solid-js";
import {
	FaSolidFileZipper,
	FaSolidFileAudio,
	FaSolidFileVideo,
	FaSolidFile,
	FaSolidFileLines,
} from "solid-icons/fa";
import type { MediaResponse } from "@types";
import Image from "@/components/Partials/Image";
import classNames from "classnames";

interface MediaPreviewProps {
	media: {
		type: MediaResponse["type"];
		url: string;
	};
	richPreview?: boolean;
	alt: string | null;
}

const MediaPreview: Component<MediaPreviewProps> = (props) => {
	// -------------------------------
	// Render
	return (
		<Switch>
			<Match when={props.media.type === "image"}>
				<Image
					classes={
						"rounded-t-md group-hover:scale-110 transition duration-100 backface-hidden"
					}
					src={`${props.media.url}?preset=thumbnail&format=webp`}
					alt={props.alt || ""}
					loading="lazy"
				/>
			</Match>
			<Match when={props.media.type === "archive"}>
				<div class="w-full h-full bg-input-base flex justify-center items-center group-hover:scale-110 transition duration-100">
					<FaSolidFileZipper size={40} class="text-icon-base opacity-40" />
				</div>
			</Match>
			<Match when={props.media.type === "audio"}>
				<div
					class={classNames(
						"w-full h-full bg-input-base flex justify-center items-center",
						{
							"group-hover:scale-110 transition duration-100":
								!props.richPreview,
						},
					)}
				>
					<Switch>
						<Match when={props.richPreview}>
							{/* biome-ignore lint/a11y/useMediaCaption: <explanation> */}
							<audio src={props.media.url} class="w-2/3" controls />
						</Match>
						<Match when={!props.richPreview}>
							<FaSolidFileAudio size={40} class="text-icon-base opacity-40" />
						</Match>
					</Switch>
				</div>
			</Match>
			<Match when={props.media.type === "video"}>
				<div
					class={classNames(
						"w-full h-full bg-input-base flex justify-center items-center",
						{
							"group-hover:scale-110 transition duration-100":
								!props.richPreview,
						},
					)}
				>
					<Switch>
						<Match when={props.richPreview}>
							{/* biome-ignore lint/a11y/useMediaCaption: <explanation> */}
							<video
								src={props.media.url}
								class="w-full h-full object-contain"
								controls
								preload="auto"
							/>
						</Match>
						<Match when={!props.richPreview}>
							<FaSolidFileVideo size={40} class="text-icon-base opacity-40" />
						</Match>
					</Switch>
				</div>
			</Match>
			<Match when={props.media.type === "document"}>
				<div class="w-full h-full bg-input-base flex justify-center items-center group-hover:scale-110 transition duration-100">
					<FaSolidFileLines size={40} class="text-icon-base opacity-40" />
				</div>
			</Match>
			<Match when={props.media.type === "unknown"}>
				<div class="w-full h-full bg-input-base flex justify-center items-center group-hover:scale-110 transition duration-100">
					<FaSolidFile size={40} class="text-icon-base opacity-40" />
				</div>
			</Match>
		</Switch>
	);
};

export default MediaPreview;
