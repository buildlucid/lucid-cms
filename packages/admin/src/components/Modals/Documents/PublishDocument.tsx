import type { CollectionResponse } from "@types";
import { type Accessor, type Component, createMemo } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";
import T from "@/translations";
import helpers from "@/utils/helpers";

interface PublishDocumentProps {
	id: Accessor<number | undefined> | number | undefined;
	draftVersionId: Accessor<number | undefined> | number | undefined;
	collection: CollectionResponse | undefined;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	callbacks?: {
		onSuccess?: () => void;
	};
}

const PublishDocument: Component<PublishDocumentProps> = (props) => {
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
	const publishDocument = api.documents.usePromoteSingle({
		onSuccess: () => {
			props.state.setOpen(false);
			if (props.callbacks?.onSuccess) props.callbacks.onSuccess();
		},
		getCollectionName: () => collectionSingularName(),
		getVersionType: () => "published",
	});

	// ------------------------------
	// Render
	return (
		<Confirmation
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: publishDocument.action.isPending,
				isError: publishDocument.action.isError,
			}}
			copy={{
				title: T()("publish_document_modal_title", {
					name: collectionSingularName(),
				}),
				description: T()("publish_document_modal_description", {
					name: collectionSingularName().toLowerCase(),
				}),
				error: publishDocument.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					const id = typeof props.id === "function" ? props.id() : props.id;
					const draftId =
						typeof props.draftVersionId === "function"
							? props.draftVersionId()
							: props.draftVersionId;
					if (!id) return console.error("No id provided");
					if (!draftId) return console.error("No draft id provided");
					if (!props.collection?.key) return;

					publishDocument.action.mutate({
						collectionKey: props.collection.key,
						id: id,
						versionId: draftId,
						body: {
							versionType: "published",
						},
					});
				},
				onCancel: () => {
					props.state.setOpen(false);
					publishDocument.reset();
				},
			}}
		/>
	);
};

export default PublishDocument;
