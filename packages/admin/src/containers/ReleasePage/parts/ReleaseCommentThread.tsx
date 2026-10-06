import type { Release, ReleaseEvent } from "@types";
import { FaSolidComment } from "solid-icons/fa";
import { type Component, For } from "solid-js";
import T from "@/translations";
import { ReleaseCommentForm } from "./ReleaseCommentForm";
import { ReleaseCommentMessage } from "./ReleaseCommentMessage";
import { ReleaseCommentResolutionSelect } from "./ReleaseCommentResolution";

/**
 * A comment in a release's activity, with its replies underneath. Whether it
 * is open, resolved or closed applies to the whole thread, so it sits at the
 * end of the first comment's header.
 */
export const ReleaseCommentThread: Component<{
	release: Release;
	comment: Extract<ReleaseEvent, { type: "comment" }>;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<li class="relative flex gap-3 py-3">
			<span class="relative z-1 mt-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-background text-icon">
				<FaSolidComment size={11} />
			</span>
			<article class="min-w-0 grow divide-y divide-border rounded-lg border border-border bg-card">
				<div class="p-4">
					<ReleaseCommentMessage
						release={props.release}
						message={props.comment}
						variant="comment"
						replies={props.comment.replies.length}
						status={
							<ReleaseCommentResolutionSelect
								release={props.release}
								comment={props.comment}
							/>
						}
					/>
				</div>
				<For each={props.comment.replies}>
					{(reply) => (
						<div class="p-4">
							<ReleaseCommentMessage
								release={props.release}
								message={reply}
								variant="reply"
							/>
						</div>
					)}
				</For>
				<div class="px-4 py-3">
					<ReleaseCommentForm
						release={props.release}
						parentId={props.comment.id}
						variant="inline"
						placeholder={T()("releases.comment.reply.placeholder")}
						submitLabel={T()("releases.comment.reply")}
					/>
				</div>
			</article>
		</li>
	);
};
