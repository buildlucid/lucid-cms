import T from "@/translations";
import type { Component, Accessor } from "solid-js";
import Modal from "@/components/Groups/Modal";
import type { CollectionResponse } from "@lucidcms/core/types";
import api from "@/services/api";

const PromoteToDraft: Component<{
	id: Accessor<number | undefined> | number | undefined;
	publishedVersionId: Accessor<number | undefined> | number | undefined;
	collection: CollectionResponse;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	callbacks?: {
		onSuccess?: () => void;
	};
}> = (props) => {
	// ----------------------------------------
	// Mutations
	const promoteToDraft = api.collections.document.usePromoteSingle({
		onSuccess: () => {
			props.state.setOpen(false);
			if (props.callbacks?.onSuccess) props.callbacks.onSuccess();
		},
		getCollectionName: () =>
			props.collection.details.singularName || T()("collection"),
		getVersionType: () => "draft",
	});

	// ------------------------------
	// Render
	return (
		<Modal.Confirmation
			theme="primary"
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: promoteToDraft.action.isPending,
				isError: promoteToDraft.action.isError,
			}}
			copy={{
				title: T()("promote_to_draft_modal_title"),
				description: T()("promote_to_draft_modal_description"),
				error: promoteToDraft.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					const id = typeof props.id === "function" ? props.id() : props.id;
					const versionId =
						typeof props.publishedVersionId === "function"
							? props.publishedVersionId()
							: props.publishedVersionId;
					if (!id) return console.error("No id provided");
					if (!versionId) return console.error("No versionId provided");

					promoteToDraft.action.mutate({
						id: id,
						collectionKey: props.collection.key,
						versionId: versionId,
						body: {
							versionType: "draft",
						},
					});
				},
				onCancel: () => {
					props.state.setOpen(false);
					promoteToDraft.reset();
				},
			}}
		/>
	);
};

export default PromoteToDraft;
