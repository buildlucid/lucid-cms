import T from "@/translations";
import type { Component, Accessor } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";

const DeleteShareLink: Component<{
	mediaId: Accessor<number | undefined> | undefined;
	linkId: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}> = (props) => {
	// ----------------------------------------
	// Mutations
	const deleteShareLink = api.mediaShareLinks.useDeleteSingle({
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
				isLoading: deleteShareLink.action.isPending,
				isError: deleteShareLink.action.isError,
			}}
			copy={{
				title: T()("delete_share_link_modal_title"),
				description: T()("delete_share_link_modal_description"),
				error: deleteShareLink.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					const mediaId = props.mediaId?.();
					const linkId = props.linkId();
					if (!mediaId || !linkId) return console.error("No ids provided");
					deleteShareLink.action.mutate({
						mediaId: mediaId,
						linkId: linkId,
					});
				},
				onCancel: () => {
					props.state.setOpen(false);
					deleteShareLink.reset();
				},
			}}
		/>
	);
};

export default DeleteShareLink;
