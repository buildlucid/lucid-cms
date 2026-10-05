import type { RichTextJSON } from "@lucidcms/rich-text";
import type { Release } from "@types";
import { type Component, createEffect, createSignal, untrack } from "solid-js";
import Button from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import Modal from "@/components/Modal/Modal";
import { richTextHasContent } from "@/components/RichText/helpers";
import RichText from "@/components/RichText/RichText";
import api from "@/services/api";
import T from "@/translations";

/**
 * Approves a release, with an optional note for the people involved. With
 * `releaseAfter` it releases straight away once approved.
 */
const ReleaseApproveModal: Component<{
	open: boolean;
	setOpen: (_open: boolean) => void;
	release: Release;
	releaseAfter?: boolean;
}> = (props) => {
	// ----------------------------------------
	// State & Mutations
	const [comment, setComment] = createSignal<RichTextJSON>();
	const [review, setReview] = createSignal<{
		revision: number;
		expectedTargets: Record<string, Record<string, number | null>>;
	}>();
	const publish = api.releases.usePublish({
		onSuccess: () => props.setOpen(false),
	});
	const approve = api.releases.useApprove({
		onSuccess: () => {
			if (props.releaseAfter) {
				publish.action.mutate({ id: props.release.id });
				return;
			}
			props.setOpen(false);
		},
	});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!props.open) return;
		setComment(undefined);
		setReview(
			untrack(() => ({
				revision: props.release.revision,
				expectedTargets: Object.fromEntries(
					props.release.documents.map((document) => [
						document.id,
						Object.fromEntries(
							document.targets.map((target) => [
								target.target,
								target.versionId,
							]),
						),
					]),
				),
			})),
		);
		approve.reset();
		publish.reset();
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Root open={props.open} onOpenChange={props.setOpen}>
			<form
				class="w-full"
				onSubmit={(event) => {
					event.preventDefault();
					const body = comment();
					const reviewed = review();
					if (!reviewed || !props.release.permissions.approve) return;
					approve.action.mutate({
						id: props.release.id,
						body: {
							...reviewed,
							body: richTextHasContent(body) ? body : undefined,
						},
					});
				}}
			>
				<Modal.Header>
					<Modal.Title>
						{props.releaseAfter
							? T()("releases.approve.and.release.title")
							: T()("releases.approve.title")}
					</Modal.Title>
					<Modal.Description>
						{props.release.scheduledAt
							? T()("releases.approve.description.scheduled")
							: T()("releases.approve.description")}
					</Modal.Description>
				</Modal.Header>
				<Modal.Body>
					<RichText
						id="release-approve-comment"
						name="release-approve-comment"
						value={comment()}
						onChange={setComment}
						label={T()("releases.approve.comment")}
						placeholder={T()("releases.approve.comment.placeholder")}
						headings={false}
					/>
				</Modal.Body>
				<Modal.Footer>
					<ErrorMessage
						theme="basic"
						message={approve.errors()?.message ?? publish.errors()?.message}
					/>
					<Modal.Actions>
						<Button variant="outline" onClick={() => props.setOpen(false)}>
							{T()("common.cancel")}
						</Button>
						<Button
							type="submit"
							disabled={!props.release.permissions.approve}
							loading={approve.action.isPending || publish.action.isPending}
						>
							{props.releaseAfter
								? T()("releases.approve.and.release")
								: T()("releases.approve")}
						</Button>
					</Modal.Actions>
				</Modal.Footer>
			</form>
		</Modal.Root>
	);
};

export default ReleaseApproveModal;
