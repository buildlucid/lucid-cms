import T from "@/translations";
import type { Component, Accessor } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";

interface RestoreMediaProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const RestoreMedia: Component<RestoreMediaProps> = (props) => {
	// ----------------------------------------
	// Mutations
	const restoreMedia = api.media.useUpdateSingle({
		onSuccess: () => {
			props.state.setOpen(false);
		},
		toast: {
			title: "restore_media_toast_title",
			message: "restore_media_toast_message",
		},
	});

	// ------------------------------
	// Render
	return (
		<Confirmation
			theme="primary"
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: restoreMedia.action.isPending,
				isError: restoreMedia.action.isError,
			}}
			copy={{
				title: T()("restore_media_modal_title"),
				description: T()("restore_media_modal_description"),
				error: restoreMedia.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					const id = props.id();
					if (!id) return console.error("No id provided");
					restoreMedia.action.mutate({
						id: id,
						body: {
							isDeleted: false,
						},
					});
				},
				onCancel: () => {
					props.state.setOpen(false);
					restoreMedia.reset();
				},
			}}
		/>
	);
};

export default RestoreMedia;
