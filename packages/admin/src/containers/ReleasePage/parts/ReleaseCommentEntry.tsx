import type { RichTextJSON } from "@lucidcms/rich-text";
import type { Release, ReleaseEvent } from "@types";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import ActionMenu from "@/components/ActionMenu/ActionMenu";
import Button from "@/components/Button/Button";
import DateText from "@/components/DateText/DateText";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import Modal from "@/components/Modal/Modal";
import { richTextHasContent } from "@/components/RichText/helpers";
import RichText from "@/components/RichText/RichText";
import RichTextContent from "@/components/RichTextContent/RichTextContent";
import UserDisplay from "@/components/UserDisplay/UserDisplay";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { ReleaseCommentResolutionSelect } from "./ReleaseCommentResolution";

/**
 * A comment in a release's activity, with whether it is open, resolved or
 * closed. Authors can edit or delete their own.
 */
export const ReleaseCommentEntry: Component<{
	release: Release;
	comment: Extract<ReleaseEvent, { type: "comment" }>;
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
		() => props.comment.user?.id === userStore.get.user?.id,
	);
	const edited = createMemo(
		() =>
			props.comment.updatedAt !== null &&
			props.comment.updatedAt !== props.comment.createdAt,
	);

	// ----------------------------------------
	// Render
	return (
		<li class="relative flex gap-3 py-3">
			<span class="relative z-1 shrink-0 rounded-full ring-4 ring-background">
				<UserDisplay user={props.comment.user ?? {}} variant="icon" size="sm" />
			</span>
			<div class="min-w-0 grow">
				<div class="flex items-center justify-between gap-3">
					<p class="text-sm text-body">
						<span class="text-title">
							{props.comment.user
								? helpers.formatUserName(props.comment.user, "name") ||
									props.comment.user.email
								: T()("common.unknown")}
						</span>
						<span class="text-border"> · </span>
						<DateText
							date={props.comment.createdAt}
							includeTime={true}
							class="text-xs"
						/>
						<Show when={edited()}>
							<span class="text-xs"> {T()("releases.activity.edited")}</span>
						</Show>
					</p>
					<div class="flex shrink-0 items-center gap-1">
						<ReleaseCommentResolutionSelect
							release={props.release}
							comment={props.comment}
						/>
						<Show when={own() && !editing()}>
							<ActionMenu
								variant="ghost"
								actions={[
									{
										label: T()("common.edit"),
										type: "button",
										icon: "pen",
										onClick: () => {
											setBody(props.comment.body);
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
						</Show>
					</div>
				</div>
				<Show
					when={editing()}
					fallback={
						<div class="mt-1.5 text-sm text-subtitle">
							<RichTextContent value={props.comment.body} />
						</div>
					}
				>
					<div class="mt-2 grid gap-2">
						<RichText
							id={`release-comment-${props.comment.id}`}
							name={`release-comment-${props.comment.id}`}
							value={body()}
							onChange={setBody}
							headings={false}
						/>
						<ErrorMessage theme="basic" message={update.errors()?.message} />
						<div class="flex justify-end gap-2">
							<Button
								size="sm"
								variant="outline"
								onClick={() => setEditing(false)}
							>
								{T()("common.cancel")}
							</Button>
							<Button
								size="sm"
								loading={update.action.isPending}
								disabled={!richTextHasContent(body())}
								onClick={() => {
									const value = body();
									if (!value) return;
									update.action.mutate({
										id: props.release.id,
										eventId: props.comment.id,
										body: { body: value },
									});
								}}
							>
								{T()("common.save")}
							</Button>
						</div>
					</div>
				</Show>
			</div>
			<Modal.Confirm
				open={deleteOpen()}
				onOpenChange={setDeleteOpen}
				title={T()("releases.comment.delete.title")}
				description={T()("releases.comment.delete.description")}
				confirmLabel={T()("common.delete")}
				loading={remove.action.isPending}
				error={remove.errors()?.message}
				onConfirm={() =>
					remove.action.mutate({
						id: props.release.id,
						eventId: props.comment.id,
					})
				}
			/>
		</li>
	);
};
