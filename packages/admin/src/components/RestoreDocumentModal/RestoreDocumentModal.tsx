import type { Collection } from "@types";
import type { Accessor, Component } from "solid-js";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

interface RestoreDocumentProps {
	id: Accessor<number | undefined>;
	collection: Collection | undefined;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const RestoreDocumentModal: Component<RestoreDocumentProps> = (props) => {
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
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.common.restore.document.title")}
			description={T()("modals.common.restore.document.description")}
			confirmVariant="primary"
			loading={restoreDocuments.action.isPending}
			error={restoreDocuments.errors()?.message}
			onConfirm={() => {
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
			}}
			onCancel={() => {
				props.state.setOpen(false);
				restoreDocuments.reset();
			}}
		/>
	);
};

export default RestoreDocumentModal;
