import type { RichTextJSON } from "@lucidcms/rich-text";
import type { Release, ReleaseCommentReply } from "@types";
import classNames from "classnames";
import {
	type Component,
	createMemo,
	createSignal,
	type JSXElement,
	Show,
} from "solid-js";
import ActionMenu from "@/components/ActionMenu/ActionMenu";
import DateText from "@/components/DateText/DateText";
import Modal from "@/components/Modal/Modal";
import UserDisplay from "@/components/UserDisplay/UserDisplay";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { ReleaseRichTextContent } from "./ReleaseRichTextContent";
import { ReleaseRichTextEditor } from "./ReleaseRichTextEditor";

/**
 * One message in a comment thread, either the comment that starts it or a
 * reply. Replies are indented to line up with the author's name. Authors can
 * edit theirs, and they or a super admin can delete it.
 */
export const ReleaseCommentMessage: Component<{
	release: Release;
	message: ReleaseCommentReply;
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
	const update = api.releases.useUpdateComment({
		onSuccess: () => setEditing(false),
	});
	const remove = api.releases.useDeleteComment({
		onSuccess: () => setDeleteOpen(false),
	});

	// ----------------------------------------
	// Memos
	const own = createMemo(
		() => props.message.user?.id === userStore.get.user?.id,
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
			id: props.release.id,
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
				<UserDisplay user={props.message.user ?? {}} variant="icon" size="xs" />
				<div class="flex min-w-0 grow flex-wrap items-center gap-x-2 gap-y-1">
					<span class="truncate text-sm font-medium text-title">
						{props.message.user
							? helpers.formatUserName(props.message.user, "name")
							: T()("common.unknown")}
					</span>
					<span class="text-xs text-body">
						<DateText
							date={props.message.createdAt}
							relative={true}
							class="text-xs"
						/>
						<Show when={edited()}>
							<span class="text-muted"> {T()("releases.activity.edited")}</span>
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
						<ReleaseRichTextContent
							release={props.release}
							value={props.message.body}
						/>
					}
				>
					<ReleaseRichTextEditor
						release={props.release}
						id={`release-comment-${props.message.id}`}
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
				title={T()("releases.comment.delete.title")}
				description={T()(
					props.replies
						? "releases.comment.delete.thread.description"
						: "releases.comment.delete.description",
				)}
				confirmLabel={T()("common.delete")}
				confirmVariant="danger"
				loading={remove.action.isPending}
				error={remove.errors()?.message}
				onConfirm={() =>
					remove.action.mutate({
						id: props.release.id,
						eventId: props.message.id,
					})
				}
			/>
		</div>
	);
};
