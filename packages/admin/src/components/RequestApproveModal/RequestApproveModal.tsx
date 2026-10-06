import type { RichTextJSON } from "@lucidcms/rich-text";
import type { RequestDetail } from "@types";
import { type Component, createEffect, createSignal, untrack } from "solid-js";
import Button from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import Modal from "@/components/Modal/Modal";
import { richTextHasContent } from "@/components/RichText/helpers";
import RichText from "@/components/RichText/RichText";
import api from "@/services/api";
import T from "@/translations";

/**
 * Approves a request, with an optional note for the people involved. With
 * `requestAfter` it completes the request straight away once approved.
 */
const RequestApproveModal: Component<{
	open: boolean;
	setOpen: (_open: boolean) => void;
	request: RequestDetail;
	requestAfter?: boolean;
}> = (props) => {
	// ----------------------------------------
	// State & Mutations
	const [comment, setComment] = createSignal<RichTextJSON>();
	const [review, setReview] = createSignal<{
		revision: number;
		expectedTargets: Record<string, Record<string, number | null>>;
	}>();
	const publish = api.requests.useComplete({
		onSuccess: () => props.setOpen(false),
	});
	const approve = api.requests.useApprove({
		onSuccess: () => {
			if (props.requestAfter) {
				publish.action.mutate({ id: props.request.id });
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
				revision: props.request.revision,
				expectedTargets: Object.fromEntries(
					props.request.documents.map((document) => [
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
					if (!reviewed || !props.request.permissions.approve) return;
					approve.action.mutate({
						id: props.request.id,
						body: {
							...reviewed,
							body: richTextHasContent(body) ? body : undefined,
						},
					});
				}}
			>
				<Modal.Header>
					<Modal.Title>
						{props.requestAfter
							? T()("requests.approve.and.complete.title")
							: T()("requests.approve.title")}
					</Modal.Title>
					<Modal.Description>
						{props.request.scheduledAt
							? T()("requests.approve.description.scheduled")
							: T()("requests.approve.description")}
					</Modal.Description>
				</Modal.Header>
				<Modal.Body>
					<RichText
						id="request-approve-comment"
						name="request-approve-comment"
						value={comment()}
						onChange={setComment}
						label={T()("requests.approve.comment")}
						placeholder={T()("requests.approve.comment.placeholder")}
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
							disabled={!props.request.permissions.approve}
							loading={approve.action.isPending || publish.action.isPending}
						>
							{props.requestAfter
								? T()("requests.approve.and.complete")
								: T()("requests.approve")}
						</Button>
					</Modal.Actions>
				</Modal.Footer>
			</form>
		</Modal.Root>
	);
};

export default RequestApproveModal;
