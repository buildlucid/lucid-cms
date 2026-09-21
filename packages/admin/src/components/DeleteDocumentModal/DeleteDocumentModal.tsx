import type { Collection } from "@types";
import { type Accessor, type Component, createMemo } from "solid-js";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";
import helpers from "@/utils/helpers";

interface DeleteDocumentProps {
	id: Accessor<number | undefined> | number | undefined;
	collection: Collection;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	callbacks?: {
		onSuccess?: () => void;
	};
}

const DeleteDocumentModal: Component<DeleteDocumentProps> = (props) => {
	// ----------------------------------------
	// Memos
	const collectionSingularName = createMemo(
		() =>
			helpers.getLocaleValue({
				value: props.collection?.details.labels.singular,
			}) || T()("common.collection"),
	);

	// ----------------------------------------
	// Mutations

	const deleteDocument = api.documents.useDeleteSingle({
		onSuccess: () => {
			props.state.setOpen(false);
			if (props.callbacks?.onSuccess) props.callbacks.onSuccess();
		},
		getCollectionName: collectionSingularName,
	});

	// ------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.common.delete.document.title", {
				name: collectionSingularName(),
			})}
			description={T()("modals.common.delete.document.description", {
				name: collectionSingularName().toLowerCase(),
			})}
			loading={deleteDocument.action.isPending}
			error={deleteDocument.errors()?.message}
			onConfirm={() => {
				const id = typeof props.id === "function" ? props.id() : props.id;
				if (!id) return console.error("No id provided");
				deleteDocument.action.mutate({
					id: id,
					collectionKey: props.collection.key,
				});
			}}
			onCancel={() => {
				props.state.setOpen(false);
				deleteDocument.reset();
			}}
		/>
	);
};

export default DeleteDocumentModal;
