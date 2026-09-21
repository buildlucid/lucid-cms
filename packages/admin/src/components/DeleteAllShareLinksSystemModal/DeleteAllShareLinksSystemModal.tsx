import type { Component } from "solid-js";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

interface DeleteAllShareLinksSystemProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const DeleteAllShareLinksSystemModal: Component<
	DeleteAllShareLinksSystemProps
> = (props) => {
	// ----------------------------------------
	// Mutations
	const deleteAllShareLinksSystem = api.mediaShareLinks.useDeleteAllSystem({
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
			title={T()("modals.common.delete.all.share.links.system.title")}
			description={T()(
				"modals.common.delete.all.share.links.system.description",
			)}
			loading={deleteAllShareLinksSystem.action.isPending}
			error={deleteAllShareLinksSystem.errors()?.message}
			onConfirm={() => {
				deleteAllShareLinksSystem.action.mutate(undefined);
			}}
			onCancel={() => {
				props.state.setOpen(false);
				deleteAllShareLinksSystem.reset();
			}}
		/>
	);
};

export default DeleteAllShareLinksSystemModal;
