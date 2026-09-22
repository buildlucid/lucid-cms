import type { MediaStatus } from "@types";
import classNames from "classnames";
import { type Component, Match, Switch } from "solid-js";
import T from "@/translations";

interface MediaStatusPreviewProps {
	status: MediaStatus;
}

/** Prevents non-ready media from being requested while keeping its state clear. */
const MediaStatusPreview: Component<MediaStatusPreviewProps> = (props) => {
	return (
		<Switch>
			<Match when={props.status === "processing"}>
				<div
					class="relative z-20 flex h-full w-full items-center justify-center bg-input p-4"
					aria-busy="true"
				>
					<p class="max-w-64 text-center text-xs leading-4 text-muted">
						{T()("media.status.processing.description")}
					</p>
				</div>
			</Match>
			<Match when={props.status === "failed"}>
				<div class="relative z-20 flex h-full w-full items-center justify-center bg-danger-low p-4">
					<p class="max-w-64 text-center text-xs leading-4 text-danger-low-foreground">
						{T()("media.status.failed.description")}
					</p>
				</div>
			</Match>
		</Switch>
	);
};

export const mediaStatusBorderClass = (status: MediaStatus) =>
	classNames({
		"border-border": status === "ready" || status === "processing",
		"border-danger-low-border": status === "failed",
	});

export default MediaStatusPreview;
