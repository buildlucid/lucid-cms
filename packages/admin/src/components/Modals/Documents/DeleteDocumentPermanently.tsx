import T from "@/translations";
import { type Component, type Accessor, createMemo } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";
import type { CollectionResponse } from "@types";
import helpers from "@/utils/helpers";

interface DeleteDocumentPermanentlyProps {
	id: Accessor<number | undefined>;
	collection: CollectionResponse;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	callbacks?: {
		onSuccess?: () => void;
	};
}

const DeleteDocumentPermanently: Component<DeleteDocumentPermanentlyProps> = (
	props,
) => {
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
	const permaDelete = api.documents.useDeleteSinglePermanently({
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
				isLoading: permaDelete.action.isPending,
				isError: permaDelete.action.isError,
			}}
			copy={{
				title: T()("delete_document_permanently_modal_title"),
				description: T()("delete_document_permanently_modal_description"),
				error: permaDelete.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					const id = props.id();
					if (!id) return console.error("No id provided");
					permaDelete.action.mutate({
						id: id,
						collectionKey: props.collection.key,
					});
				},
				onCancel: () => {
					props.state.setOpen(false);
					permaDelete.reset();
				},
			}}
		/>
	);
};

export default DeleteDocumentPermanently;
