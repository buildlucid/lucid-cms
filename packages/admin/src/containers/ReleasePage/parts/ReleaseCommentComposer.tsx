import type { RichTextJSON } from "@lucidcms/rich-text";
import type { Release } from "@types";
import { type Component, createEffect, createSignal, on, Show } from "solid-js";
import Button from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import { richTextHasContent } from "@/components/RichText/helpers";
import RichText from "@/components/RichText/RichText";
import UserDisplay from "@/components/UserDisplay/UserDisplay";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";

/**
 * A comment box that floats at the bottom of the release. It starts as a
 * single line, opens into the editor when clicked and closes again if focus
 * leaves it before anything is written.
 */
export const ReleaseCommentComposer: Component<{
	release: Release;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [open, setOpen] = createSignal(false);
	const [comment, setComment] = createSignal<RichTextJSON>();
	let form: HTMLFormElement | undefined;

	// ----------------------------------------
	// Queries & Mutations
	const create = api.releases.useCreateComment({
		onSuccess: () => {
			setComment(undefined);
			setOpen(false);
		},
	});

	// ----------------------------------------
	// Functions
	const closeIfEmpty = (event: FocusEvent) => {
		const next = event.relatedTarget;
		if (next instanceof Node && form?.contains(next)) return;
		if (!richTextHasContent(comment())) setOpen(false);
	};
	const submit = () => {
		const body = comment();
		if (!body || !richTextHasContent(body)) return;
		create.action.mutate({ id: props.release.id, body: { body } });
	};

	// ----------------------------------------
	// Effects
	createEffect(
		on(open, async (isOpen) => {
			if (!isOpen) return;
			await new Promise(requestAnimationFrame);
			form?.querySelector<HTMLElement>("[contenteditable=true]")?.focus();
		}),
	);

	// ----------------------------------------
	// Render
	return (
		<div class="sticky bottom-0 z-10 mt-auto pt-6 pb-4 md:pb-6">
			<div
				aria-hidden="true"
				class="pointer-events-none absolute inset-x-0 top-0 bottom-0 bg-linear-to-t from-background via-background to-transparent"
			/>
			<Show
				when={open()}
				fallback={
					<button
						type="button"
						class="relative flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-3 py-2.5 text-left text-sm text-muted shadow-sm transition-colors hover:border-primary/60 focus:outline-hidden focus-visible:border-primary"
						onClick={() => setOpen(true)}
					>
						<UserDisplay
							user={userStore.get.user ?? {}}
							variant="icon"
							size="xs"
						/>
						{T()("releases.comment.placeholder")}
					</button>
				}
			>
				<form
					ref={form}
					class="relative grid gap-2 overflow-hidden rounded-2xl border border-border bg-card pb-3 shadow-sm transition-colors focus-within:border-primary"
					onSubmit={(event) => {
						event.preventDefault();
						submit();
					}}
					onFocusOut={closeIfEmpty}
					onKeyDown={(event) => {
						if (event.key === "Escape" && !richTextHasContent(comment())) {
							setOpen(false);
						}
					}}
				>
					<RichText
						id="release-comment"
						name="release-comment"
						value={comment()}
						onChange={setComment}
						placeholder={T()("releases.comment.placeholder")}
						headings={false}
						class="[&_[data-rich-text]]:rounded-none [&_[data-rich-text]]:border-0 [&_[data-rich-text]]:bg-transparent [&_[data-rich-text-control]]:max-h-60 [&_[data-rich-text-control]]:overflow-y-auto"
					/>
					<ErrorMessage
						theme="basic"
						classes="px-3"
						message={create.errors()?.message}
					/>
					<div class="flex justify-end gap-2 px-3">
						<Button size="sm" variant="outline" onClick={() => setOpen(false)}>
							{T()("common.cancel")}
						</Button>
						<Button
							type="submit"
							size="sm"
							loading={create.action.isPending}
							disabled={!richTextHasContent(comment())}
						>
							{T()("releases.comment.submit")}
						</Button>
					</div>
				</form>
			</Show>
		</div>
	);
};
