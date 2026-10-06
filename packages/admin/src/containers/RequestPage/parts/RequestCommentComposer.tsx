import type { RequestDetail } from "@types";
import type { Component } from "solid-js";
import T from "@/translations";
import { RequestCommentForm } from "./RequestCommentForm";

export const RequestCommentComposer: Component<{
	request: RequestDetail;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div class="sticky bottom-0 z-10 mt-auto pt-6 pb-4 md:pb-6">
			<div
				aria-hidden="true"
				class="pointer-events-none absolute inset-x-0 top-0 bottom-0 bg-linear-to-t from-background via-background to-transparent"
			/>
			<RequestCommentForm
				request={props.request}
				variant="floating"
				placeholder={T()("requests.comment.placeholder")}
				submitLabel={T()("requests.comment.submit")}
			/>
		</div>
	);
};
