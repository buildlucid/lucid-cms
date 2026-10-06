import type {
	RequestCommentResolution,
	RequestDetail,
	RequestEvent,
} from "@types";
import { type Component, createMemo } from "solid-js";
import StatusSelect, {
	type StatusSelectOption,
} from "@/components/StatusSelect/StatusSelect";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import helpers from "@/utils/helpers";

type ResolutionOption = RequestCommentResolution | "open";

/**
 * Whether a comment thread is open, resolved or closed, shown at the end of
 * the first comment's header with who changed it on hover. Open comments
 * stop the request being approved. The author and anyone who can edit or
 * approve the request can change it while the request is open.
 */
export const RequestCommentResolutionSelect: Component<{
	request: RequestDetail;
	comment: Extract<RequestEvent, { type: "comment" }>;
}> = (props) => {
	// ----------------------------------------
	// Mutations
	const update = api.requests.useUpdateCommentResolution();

	// ----------------------------------------
	// Memos
	const options = createMemo((): StatusSelectOption<ResolutionOption>[] => [
		{
			value: "open",
			label: T()("requests.comment.resolution.open"),
			indicator: "warning-subtle",
		},
		{
			value: "resolved",
			label: T()("requests.comment.resolution.resolved"),
			indicator: "success-subtle",
		},
		{
			value: "closed",
			label: T()("requests.comment.resolution.closed"),
			indicator: "neutral-subtle",
		},
	]);
	const current = createMemo<ResolutionOption>(
		() => props.comment.resolution ?? "open",
	);
	const editable = createMemo(
		() =>
			props.request.status === "open" &&
			(props.comment.user?.id === userStore.get.user?.id ||
				props.request.permissions.edit ||
				props.request.permissions.approve),
	);
	const resolvedBy = createMemo(() =>
		props.comment.resolvedBy
			? T()("requests.comment.resolution.by", {
					name:
						helpers.formatUserName(props.comment.resolvedBy, "name") ||
						T()("common.unknown"),
				})
			: undefined,
	);

	// ----------------------------------------
	// Render
	return (
		<StatusSelect
			value={current()}
			options={options()}
			label={T()("requests.comment.resolution")}
			editable={editable()}
			loading={update.action.isPending}
			title={resolvedBy()}
			onChange={(option) =>
				update.action.mutate({
					id: props.request.id,
					eventId: props.comment.id,
					body: { resolution: option === "open" ? null : option },
				})
			}
		/>
	);
};
