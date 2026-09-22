import type { PublishOperation } from "@types";
import { FaSolidCircleCheck, FaSolidComment } from "solid-icons/fa";
import { type Component, createMemo, Show } from "solid-js";
import Table from "@/components/Table/Table";
import T from "@/translations";
import { getRichTextSummary } from "@/utils/rich-text";

const ReleaseRequestCommentsCell: Component<{
	column?: string;
	request: PublishOperation;
	minWidth?: number;
}> = (props) => {
	const requestComment = createMemo(() =>
		getRichTextSummary(props.request.requestComment),
	);
	const decisionComment = createMemo(() =>
		getRichTextSummary(props.request.decisionComment),
	);

	// ----------------------------------
	// Render
	return (
		<Table.Cell column={props.column} minWidth={props.minWidth}>
			<div class="grid w-full min-w-0 gap-1">
				<Show when={requestComment()}>
					{(comment) => (
						<p
							class="flex min-w-0 items-center gap-1.5 text-sm leading-5 text-subtitle"
							title={comment()}
						>
							<span class="flex size-4 shrink-0 items-center justify-center">
								<FaSolidComment
									size={11}
									class="text-icon"
									title={T()("publish.requests.detail.request.comment")}
								/>
							</span>
							<span class="truncate">{comment()}</span>
						</p>
					)}
				</Show>
				<Show when={decisionComment()}>
					{(comment) => (
						<p
							class="flex min-w-0 items-center gap-1.5 text-sm leading-5 text-subtitle"
							title={comment()}
						>
							<span class="flex size-4 shrink-0 items-center justify-center">
								<FaSolidCircleCheck
									size={11}
									class="text-icon"
									title={T()("common.decision.comment")}
								/>
							</span>
							<span class="truncate">{comment()}</span>
						</p>
					)}
				</Show>
				<Show when={!requestComment() && !decisionComment()}>
					<span class="text-sm text-body">-</span>
				</Show>
			</div>
		</Table.Cell>
	);
};

export default ReleaseRequestCommentsCell;
