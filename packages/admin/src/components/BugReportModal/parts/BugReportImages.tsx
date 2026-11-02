import { type Component, For, Show } from "solid-js";
import AgentReferenceRemoveButton from "@/components/AgentReferenceRemoveButton/AgentReferenceRemoveButton";
import Skeleton from "@/components/Skeleton/Skeleton";
import T from "@/translations";

export interface BugReportImage {
	id: string;
	mimeType: "image/webp";
	/** Base64 without a data URL prefix. */
	data: string;
}

/** Shows attachment thumbnails and resizing placeholders. */
const BugReportImages: Component<{
	images: BugReportImage[];
	preparing: boolean;
	/** Locks the images while the report sends. */
	disabled: boolean;
	error?: string;
	onRemove: (_id: string) => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Show when={props.images.length > 0 || props.preparing || props.error}>
			<div class="flex flex-col gap-2">
				<Show when={props.images.length > 0 || props.preparing}>
					<div class="flex flex-wrap gap-2">
						<For each={props.images}>
							{(image, index) => (
								<div class="group relative h-12 w-16 overflow-hidden rounded-md border border-border bg-input">
									<img
										src={`data:${image.mimeType};base64,${image.data}`}
										alt={T()("bug.report.images.alt", { number: index() + 1 })}
										class="size-full object-cover object-top"
									/>
									<Show when={!props.disabled}>
										<AgentReferenceRemoveButton
											label={T()("bug.report.images.remove", {
												number: index() + 1,
											})}
											class="end-1 top-1"
											onRemove={() => props.onRemove(image.id)}
										/>
									</Show>
								</div>
							)}
						</For>
						<Show when={props.preparing}>
							<Skeleton>
								<span class="skeleton block h-12 w-16 rounded-md" />
							</Skeleton>
						</Show>
					</div>
				</Show>
				<Show when={props.error}>
					<p class="text-sm text-danger">{props.error}</p>
				</Show>
			</div>
		</Show>
	);
};

export default BugReportImages;
