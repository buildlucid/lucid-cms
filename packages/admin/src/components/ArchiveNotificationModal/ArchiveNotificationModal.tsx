import type { Accessor, Component } from "solid-js";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

interface ArchiveNotificationModalProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const ArchiveNotificationModal: Component<ArchiveNotificationModalProps> = (
	props,
) => {
	// ----------------------------------------
	// Mutations
	const update = api.notifications.useUpdateMultiple({
		onSuccess: () => props.state.setOpen(false),
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.notifications.archive.title")}
			description={T()("modals.notifications.archive.description")}
			confirmLabel={T()("notifications.archive")}
			loading={update.action.isPending}
			error={update.errors()?.message}
			onConfirm={() => {
				const id = props.id();
				if (id === undefined) return;
				update.action.mutate({ ids: [id], archived: true, read: true });
			}}
			onCancel={() => {
				props.state.setOpen(false);
				update.reset();
			}}
		/>
	);
};

export default ArchiveNotificationModal;
