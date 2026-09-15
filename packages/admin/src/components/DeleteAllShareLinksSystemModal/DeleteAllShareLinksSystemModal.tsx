import type { Component } from "solid-js";
import { ConfirmationModal } from "@/components/ConfirmationModal/ConfirmationModal";
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
		<ConfirmationModal
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: deleteAllShareLinksSystem.action.isPending,
				isError: deleteAllShareLinksSystem.action.isError,
			}}
			copy={{
				title: T()("modals.common.delete.all.share.links.system.title"),
				description: T()(
					"modals.common.delete.all.share.links.system.description",
				),
				error: deleteAllShareLinksSystem.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					deleteAllShareLinksSystem.action.mutate(undefined);
				},
				onCancel: () => {
					props.state.setOpen(false);
					deleteAllShareLinksSystem.reset();
				},
			}}
		/>
	);
};

export default DeleteAllShareLinksSystemModal;
