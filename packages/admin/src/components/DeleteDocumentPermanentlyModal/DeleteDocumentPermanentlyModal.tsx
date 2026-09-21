import type { Collection } from "@types";
import { type Accessor, type Component, createMemo } from "solid-js";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";
import helpers from "@/utils/helpers";

interface DeleteDocumentPermanentlyProps {
	id: Accessor<number | undefined>;
	collection: Collection;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	callbacks?: {
		onSuccess?: () => void;
	};
}

const DeleteDocumentPermanentlyModal: Component<
	DeleteDocumentPermanentlyProps
> = (props) => {
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
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.common.delete.document.permanently.title")}
			description={T()("modals.common.delete.document.permanently.description")}
			loading={permaDelete.action.isPending}
			error={permaDelete.errors()?.message}
			onConfirm={() => {
				const id = props.id();
				if (!id) return console.error("No id provided");
				permaDelete.action.mutate({
					id: id,
					collectionKey: props.collection.key,
				});
			}}
			onCancel={() => {
				props.state.setOpen(false);
				permaDelete.reset();
			}}
		/>
	);
};

export default DeleteDocumentPermanentlyModal;
