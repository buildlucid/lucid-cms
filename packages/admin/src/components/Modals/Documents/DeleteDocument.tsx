import type { CollectionResponse } from "@types";
import { type Accessor, type Component, createMemo } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";
import T from "@/translations";
import helpers from "@/utils/helpers";

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
	// Memos
	const collectionSingularName = createMemo(
		() =>
			helpers.getLocaleValue({
				value: props.collection?.details.singularName,
			}) || T()("collection"),
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
		<Confirmation
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: deleteDocument.action.isPending,
				isError: deleteDocument.action.isError,
			}}
			copy={{
				title: T()("delete_document_modal_title", {
					name: collectionSingularName(),
				}),
				description: T()("delete_document_modal_description", {
					name: collectionSingularName().toLowerCase(),
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
