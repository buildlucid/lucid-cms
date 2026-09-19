import type { Accessor, Component } from "solid-js";
import { Modal } from "@/components/Modal/Modal";
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
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.common.restore.media.title")}
			description={T()("modals.common.restore.media.description")}
			confirmVariant="primary"
			loading={restoreMedia.action.isPending}
			error={restoreMedia.errors()?.message}
			onConfirm={() => {
				const id = props.id();
				if (!id) return console.error("No id provided");
				restoreMedia.action.mutate({
					body: {
						ids: [id],
					},
				});
			}}
			onCancel={() => {
				props.state.setOpen(false);
				restoreMedia.reset();
			}}
		/>
	);
};

export default RestoreMediaModal;
