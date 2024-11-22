import T from "@/translations";
import type { Component, Accessor } from "solid-js";
import Modal from "@/components/Groups/Modal";
import type { CollectionResponse } from "@lucidcms/core/types";
import api from "@/services/api";

interface DeleteDocumentProps {
	id: Accessor<number | undefined> | number | undefined;
	collection: CollectionResponse;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	callbacks?: {
		onSuccess?: () => void;
	};
}

const DeleteDocument: Component<DeleteDocumentProps> = (props) => {
	// ----------------------------------------
	// Mutations
	const deleteDocument = api.collections.document.useDeleteSingle({
		onSuccess: () => {
			props.state.setOpen(false);
			if (props.callbacks?.onSuccess) props.callbacks.onSuccess();
		},
		getCollectionName: () =>
			props.collection.details.singularName || T()("collection"),
	});

	// ------------------------------
	// Render
	return (
		<Modal.Confirmation
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: deleteDocument.action.isPending,
				isError: deleteDocument.action.isError,
			}}
			copy={{
				title: T()("delete_document_modal_title", {
					name: props.collection.details.singularName,
				}),
				description: T()("delete_document_modal_description", {
					name: props.collection.details.singularName.toLowerCase(),
				}),
				error: deleteDocument.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					const id = typeof props.id === "function" ? props.id() : props.id;
					if (!id) return console.error("No id provided");
					deleteDocument.action.mutate({
						id: id,
						collectionKey: props.collection.key,
					});
				},
				onCancel: () => {
					props.state.setOpen(false);
					deleteDocument.reset();
				},
			}}
		/>
	);
};

export default DeleteDocument;
