import type { RichTextJSON } from "@lucidcms/rich-text";
import type { RequestCommentReply, RequestDetail } from "@types";
import classNames from "classnames";
import {
	type Component,
	createMemo,
	createSignal,
	type JSXElement,
	Show,
} from "solid-js";
import ActionMenu from "@/components/ActionMenu/ActionMenu";
import ActorDisplay from "@/components/ActorDisplay/ActorDisplay";
import DateText from "@/components/DateText/DateText";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { RequestRichTextContent } from "./RequestRichTextContent";
import { RequestRichTextEditor } from "./RequestRichTextEditor";

/** Renders a comment or reply with author controls, allowing only super admins to delete agent messages. */
export const RequestCommentMessage: Component<{
	request: RequestDetail;
	message: RequestCommentReply;
	variant: "comment" | "reply";
	/** Replies deleted along with it. */
	replies?: number;
	/** Shown at the end of the header, after the actions, such as the thread's status. */
	status?: JSXElement;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [editing, setEditing] = createSignal(false);
	const [body, setBody] = createSignal<RichTextJSON>();
	const [deleteOpen, setDeleteOpen] = createSignal(false);

	// ----------------------------------------
	// Mutations
	const update = api.requests.useUpdateComment({
		onSuccess: () => setEditing(false),
	});
	const remove = api.requests.useDeleteComment({
		onSuccess: () => setDeleteOpen(false),
	});

	// ----------------------------------------
	// Memos
	const own = createMemo(
		() =>
			props.message.agent === null &&
			props.message.user?.id === userStore.get.user?.id,
	);
	const canDelete = createMemo(
		() => own() || userStore.get.user?.superAdmin === true,
	);
	const edited = createMemo(
		() =>
			props.message.updatedAt !== null &&
			props.message.updatedAt !== props.message.createdAt,
	);

	// ----------------------------------------
	// Functions
	const save = () => {
		const value = body();
		if (!value) return;
		update.action.mutate({
			id: props.request.id,
			eventId: props.message.id,
			body: { body: value },
		});
	};
	//* editing ends when focus leaves without changes, or with Escape. Both
	//* sides are editor JSON, and the saved one is a store proxy, so compare text
	const closeIfUnchanged = () => {
		if (JSON.stringify(body()) === JSON.stringify(props.message.body)) {
			setEditing(false);
		}
	};

	// ----------------------------------------
	// Render
	return (
		<div class="group/message">
			<div class="flex items-center gap-2.5">
				<ActorDisplay
					user={props.message.user}
					agent={props.message.agent}
					variant="icon"
				/>
				<div class="flex min-w-0 grow flex-wrap items-center gap-x-2 gap-y-1">
					<span class="truncate text-sm font-medium text-title">
						{props.message.agent?.name ||
							helpers.formatUserName(props.message.user, "name") ||
							T()("common.unknown")}
					</span>
					<span class="text-xs text-body">
						<DateText
							date={props.message.createdAt}
							relative={true}
							class="text-xs"
						/>
						<Show when={edited()}>
							<span class="text-muted"> {T()("requests.activity.edited")}</span>
						</Show>
					</span>
				</div>
				<div
					class={classNames("-my-1 flex shrink-0 items-center gap-1", {
						"-me-1.5": !props.status,
					})}
				>
					<Show when={canDelete() && !editing()}>
						<div class="transition-opacity md:opacity-0 md:group-hover/message:opacity-100 md:focus-within:opacity-100 md:has-data-expanded:opacity-100">
							<ActionMenu
								variant="ghost"
								orientation="horizontal"
								actions={[
									{
										label: T()("common.edit"),
										type: "button",
										icon: "pen",
										show: own(),
										onClick: () => {
											setBody(props.message.body);
											setEditing(true);
										},
									},
									{
										label: T()("common.delete"),
										type: "button",
										icon: "trash",
										variant: "danger",
										onClick: () => setDeleteOpen(true),
									},
								]}
							/>
						</div>
					</Show>
					{props.status}
				</div>
			</div>
			<div
				class={classNames("mt-2", {
					"ps-7.5": props.variant === "reply",
				})}
			>
				<Show
					when={editing()}
					fallback={
						<RequestRichTextContent
							request={props.request}
							value={props.message.body}
						/>
					}
				>
					<RequestRichTextEditor
						request={props.request}
						id={`request-comment-${props.message.id}`}
						value={body()}
						onChange={setBody}
						onSubmit={save}
						submitting={update.action.isPending}
						submitLabel={T()("common.save")}
						error={update.errors()?.message}
						variant="inline"
						onFocusLeave={closeIfUnchanged}
						onEscape={() => setEditing(false)}
						onClose={() => setEditing(false)}
					/>
				</Show>
			</div>
			<Modal.Confirm
				open={deleteOpen()}
				onOpenChange={setDeleteOpen}
				title={T()("requests.comment.delete.title")}
				description={T()(
					props.replies
						? "requests.comment.delete.thread.description"
						: "requests.comment.delete.description",
				)}
				confirmLabel={T()("common.delete")}
				confirmVariant="danger"
				loading={remove.action.isPending}
				error={remove.errors()?.message}
				onConfirm={() =>
					remove.action.mutate({
						id: props.request.id,
						eventId: props.message.id,
					})
				}
			/>
		</div>
	);
};
