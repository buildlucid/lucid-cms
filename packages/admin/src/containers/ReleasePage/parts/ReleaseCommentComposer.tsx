import type { Release } from "@types";
import type { Component } from "solid-js";
import T from "@/translations";
import { ReleaseCommentForm } from "./ReleaseCommentForm";

export const ReleaseCommentComposer: Component<{
	release: Release;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div class="sticky bottom-0 z-10 mt-auto pt-6 pb-4 md:pb-6">
			<div
				aria-hidden="true"
				class="pointer-events-none absolute inset-x-0 top-0 bottom-0 bg-linear-to-t from-background via-background to-transparent"
			/>
			<ReleaseCommentForm
				release={props.release}
				variant="floating"
				placeholder={T()("releases.comment.placeholder")}
				submitLabel={T()("releases.comment.submit")}
			/>
		</div>
	);
};
