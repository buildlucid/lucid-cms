import type { RichTextJSON } from "@lucidcms/rich-text";
import type { RequestDetail } from "@types";
import classNames from "classnames";
import { type Component, createSignal, Show } from "solid-js";
import { richTextHasContent } from "@/components/RichText/helpers";
import UserDisplay from "@/components/UserDisplay/UserDisplay";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import { RequestRichTextEditor } from "./RequestRichTextEditor";

/**
 * Writes a comment, or a reply when `parentId` is set. It starts as a single
 * line, opens into the editor when clicked and closes again if focus leaves
 * it, or Escape is pressed, before anything is written. The close button
 * discards what was written.
 */
export const RequestCommentForm: Component<{
	request: RequestDetail;
	parentId?: number;
	/** `floating` is the card at the bottom of the request, `inline` sits at the end of a thread. */
	variant: "floating" | "inline";
	placeholder: string;
	submitLabel: string;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [open, setOpen] = createSignal(false);
	const [comment, setComment] = createSignal<RichTextJSON>();

	// ----------------------------------------
	// Mutations
	const create = api.requests.useCreateComment({
		onSuccess: () => {
			setComment(undefined);
			setOpen(false);
		},
	});

	// ----------------------------------------
	// Functions
	const closeIfEmpty = () => {
		if (!richTextHasContent(comment())) setOpen(false);
	};
	const discard = () => {
		setComment(undefined);
		setOpen(false);
	};
	const submit = () => {
		const body = comment();
		if (!body) return;
		create.action.mutate({
			id: props.request.id,
			body: { body, parentId: props.parentId },
		});
	};

	// ----------------------------------------
	// Render
	return (
		<Show
			when={open()}
			fallback={
				<button
					type="button"
					class={classNames(
						"relative flex w-full min-w-0 items-center text-left text-sm text-muted transition-colors focus:outline-hidden",
						{
							"gap-3 rounded-2xl border border-border bg-card px-3 py-2.5 shadow-sm hover:border-primary/60 focus-visible:border-primary":
								props.variant === "floating",
							"gap-2.5 rounded-md hover:text-body focus-visible:text-body":
								props.variant === "inline",
						},
					)}
					onClick={() => setOpen(true)}
				>
					<UserDisplay
						user={userStore.get.user ?? {}}
						variant="icon"
						size="xs"
					/>
					{props.placeholder}
				</button>
			}
		>
			<RequestRichTextEditor
				request={props.request}
				id={
					props.parentId ? `request-reply-${props.parentId}` : "request-comment"
				}
				value={comment()}
				onChange={setComment}
				onSubmit={submit}
				submitting={create.action.isPending}
				submitLabel={props.submitLabel}
				placeholder={props.placeholder}
				error={create.errors()?.message}
				variant={props.variant}
				onFocusLeave={closeIfEmpty}
				onEscape={closeIfEmpty}
				onClose={discard}
			/>
		</Show>
	);
};
