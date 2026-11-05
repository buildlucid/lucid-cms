import type { Component } from "solid-js";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

/** Confirms revoking a document's preview links, which stops every one shared so far from working. */
const RevokePreviewLinksModal: Component<{
	collectionKey: string;
	documentId: number | undefined;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** Runs once the links are revoked, eg. to start the builder's own preview again. */
	onRevoked?: () => void;
}> = (props) => {
	// ----------------------------------------
	// Mutations
	const revokePreviews = api.documents.useRevokePreviews({
		onSuccess: () => {
			props.onOpenChange(false);
			props.onRevoked?.();
		},
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.open}
			onOpenChange={props.onOpenChange}
			title={T()("modals.preview.links.revoke.title")}
			description={T()("modals.preview.links.revoke.description")}
			confirmLabel={T()("preview.links.revoke")}
			confirmVariant="danger"
			loading={revokePreviews.action.isPending}
			error={revokePreviews.errors()?.message}
			onConfirm={() => {
				const documentId = props.documentId;
				if (documentId === undefined) return;
				revokePreviews.action.mutate({
					collectionKey: props.collectionKey,
					documentId,
				});
			}}
			onCancel={() => {
				props.onOpenChange(false);
				revokePreviews.reset();
			}}
		/>
	);
};

export default RevokePreviewLinksModal;
