import type { Accessor, Component } from "solid-js";
import { Modal } from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

interface DeleteAllShareLinksProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const DeleteAllShareLinksModal: Component<DeleteAllShareLinksProps> = (
	props,
) => {
	// ----------------------------------------
	// Mutations
	const deleteAllShareLinks = api.mediaShareLinks.useDeleteAllForMedia({
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
			title={T()("modals.common.delete.all.share.links.title")}
			description={T()("modals.common.delete.all.share.links.description")}
			loading={deleteAllShareLinks.action.isPending}
			error={deleteAllShareLinks.errors()?.message}
			onConfirm={() => {
				const id = props.id();
				if (!id) return console.error("No id provided");
				deleteAllShareLinks.action.mutate({
					mediaId: id,
				});
			}}
			onCancel={() => {
				props.state.setOpen(false);
				deleteAllShareLinks.reset();
			}}
		/>
	);
};

export default DeleteAllShareLinksModal;
