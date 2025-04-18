import T from "@/translations";
import { type Component, type Accessor, createMemo } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import helpers from "@/utils/helpers";
import type { CollectionResponse } from "@types";
import api from "@/services/api";

const PromoteToDraft: Component<{
	id: Accessor<number | undefined> | number | undefined;
	publishedVersionId: Accessor<number | undefined> | number | undefined;
	collection: CollectionResponse | undefined;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	callbacks?: {
		onSuccess?: () => void;
	};
}> = (props) => {
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
	const promoteToDraft = api.documents.usePromoteSingle({
		onSuccess: () => {
			props.state.setOpen(false);
			if (props.callbacks?.onSuccess) props.callbacks.onSuccess();
		},
		getCollectionName: collectionSingularName,
		getVersionType: () => "draft",
	});

	// ------------------------------
	// Render
	return (
		<Confirmation
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
					if (!props.collection?.key) return;

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
