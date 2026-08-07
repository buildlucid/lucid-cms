import type { Collection } from "@types";
import { type Accessor, type Component, createMemo } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";
import T from "@/translations";
import helpers from "@/utils/helpers";

interface DuplicateDocumentProps {
	id: Accessor<number | undefined> | number | undefined;
	collection: Collection;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	callbacks?: {
		onSuccess?: (_id: number) => void;
	};
}

const DuplicateDocument: Component<DuplicateDocumentProps> = (props) => {
	// ----------------------------------------
	// Memos
	const collectionSingularName = createMemo(
		() =>
			helpers.getLocaleValue({
				value: props.collection?.details.singularName,
			}) || T()("common.document"),
	);

	// ----------------------------------------
	// Mutations
	const duplicateDocument = api.documents.useDuplicateSingle({
		onSuccess: (response) => {
			props.state.setOpen(false);
			props.callbacks?.onSuccess?.(response.data.id);
		},
		getCollectionName: collectionSingularName,
	});

	// ------------------------------
	// Render
	return (
		<Confirmation
			theme="primary"
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: duplicateDocument.action.isPending,
				isError: duplicateDocument.action.isError,
			}}
			copy={{
				title: T()("modals.documents.duplicate.title", {
					name: collectionSingularName(),
				}),
				description: T()("modals.documents.duplicate.description", {
					name: collectionSingularName().toLowerCase(),
				}),
				confirm: T()("actions.with.collection", {
					action: T()("common.duplicate"),
					collectionSingle: collectionSingularName(),
				}),
				error: duplicateDocument.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					const id = typeof props.id === "function" ? props.id() : props.id;
					if (!id) return console.error("No id provided");

					duplicateDocument.action.mutate({
						id,
						collectionKey: props.collection.key,
					});
				},
				onCancel: () => {
					props.state.setOpen(false);
					duplicateDocument.reset();
				},
			}}
		/>
	);
};

export default DuplicateDocument;
