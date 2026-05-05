import notifyIllustration from "@assets/illustrations/notify.svg";
import type { Component } from "solid-js";
import T from "@/translations";

const PublishRequestPreviewPlaceholder: Component<{
	classes?: string;
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<div
			class={`dotted-background flex min-h-[420px] items-center justify-center rounded-md border border-dashed border-border bg-background-base p-6 text-center ${props.classes ?? ""}`}
		>
			<div class="flex max-w-sm flex-col items-center">
				<img
					src={notifyIllustration}
					alt=""
					class="mb-6 h-32 w-32 object-contain opacity-80"
				/>
				<h2 class="text-base font-semibold text-title">
					{T()("publish_request_preview_unavailable")}
				</h2>
				<p class="mt-1 text-sm text-body">
					{T()("publish_request_preview_unavailable_description")}
				</p>
			</div>
		</div>
	);
};

export default PublishRequestPreviewPlaceholder;
