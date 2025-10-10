import T from "@/translations";
import type { Component, Accessor } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";
import type { CollectionResponse } from "@types";

interface RestoreDocumentProps {
	id: Accessor<number | undefined>;
	collection: CollectionResponse | undefined;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const RestoreDocument: Component<RestoreDocumentProps> = (props) => {
	// ----------------------------------------
	// Mutations
	const restoreDocuments = api.documents.useRestore({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});

	// ------------------------------
	// Render
	return (
		<Confirmation
			theme="primary"
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: restoreDocuments.action.isPending,
				isError: restoreDocuments.action.isError,
			}}
			copy={{
				title: T()("restore_document_modal_title"),
				description: T()("restore_document_modal_description"),
				error: restoreDocuments.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					const id = props.id();
					if (!id) return console.error("No id provided");
					if (!props.collection?.key)
						return console.error("No collection key provided");
					restoreDocuments.action.mutate({
						collectionKey: props.collection?.key,
						body: {
							ids: [id],
						},
					});
				},
				onCancel: () => {
					props.state.setOpen(false);
					restoreDocuments.reset();
				},
			}}
		/>
	);
};

export default RestoreDocument;
