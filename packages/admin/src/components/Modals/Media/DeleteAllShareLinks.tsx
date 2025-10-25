import T from "@/translations";
import type { Component, Accessor } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";

interface DeleteAllShareLinksProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const DeleteAllShareLinks: Component<DeleteAllShareLinksProps> = (props) => {
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
		<Confirmation
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: deleteAllShareLinks.action.isPending,
				isError: deleteAllShareLinks.action.isError,
			}}
			copy={{
				title: T()("delete_all_share_links_modal_title"),
				description: T()("delete_all_share_links_modal_description"),
				error: deleteAllShareLinks.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					const id = props.id();
					if (!id) return console.error("No id provided");
					deleteAllShareLinks.action.mutate({
						mediaId: id,
					});
				},
				onCancel: () => {
					props.state.setOpen(false);
					deleteAllShareLinks.reset();
				},
			}}
		/>
	);
};

export default DeleteAllShareLinks;
