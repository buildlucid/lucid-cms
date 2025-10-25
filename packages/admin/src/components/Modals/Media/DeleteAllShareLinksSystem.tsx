import T from "@/translations";
import type { Component } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";

interface DeleteAllShareLinksSystemProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const DeleteAllShareLinksSystem: Component<DeleteAllShareLinksSystemProps> = (
	props,
) => {
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
		<Confirmation
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: deleteAllShareLinksSystem.action.isPending,
				isError: deleteAllShareLinksSystem.action.isError,
			}}
			copy={{
				title: T()("delete_all_share_links_system_modal_title"),
				description: T()("delete_all_share_links_system_modal_description"),
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

export default DeleteAllShareLinksSystem;
