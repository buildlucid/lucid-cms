import type { Accessor, Component } from "solid-js";
import { ConfirmationModal } from "@/components/ConfirmationModal/ConfirmationModal";
import api from "@/services/api";
import T from "@/translations";

interface RestoreMediaProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const RestoreMediaModal: Component<RestoreMediaProps> = (props) => {
	// ----------------------------------------
	// Mutations
	const restoreMedia = api.media.useRestore({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});

	// ------------------------------
	// Render
	return (
		<ConfirmationModal
			theme="primary"
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: restoreMedia.action.isPending,
				isError: restoreMedia.action.isError,
			}}
			copy={{
				title: T()("modals.common.restore.media.title"),
				description: T()("modals.common.restore.media.description"),
				error: restoreMedia.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					const id = props.id();
					if (!id) return console.error("No id provided");
					restoreMedia.action.mutate({
						body: {
							ids: [id],
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

export default RestoreMediaModal;
