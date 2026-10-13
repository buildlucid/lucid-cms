import { type Component, createEffect, untrack } from "solid-js";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

/** Confirms marking every notification as read, for the notifications page and bell. */
const ReadAllNotificationsModal: Component<{
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}> = (props) => {
	// ----------------------------------------
	// Queries & Mutations
	const update = api.notifications.useUpdateMultiple({
		onSuccess: () => props.state.setOpen(false),
	});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (props.state.open) untrack(update.reset);
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.notifications.read.all.title")}
			description={T()("modals.notifications.read.all.description")}
			confirmLabel={T()("notifications.mark.all.read")}
			loading={update.action.isPending}
			error={update.errors()?.message}
			onConfirm={() => update.action.mutate({ all: true, read: true })}
		/>
	);
};

export default ReadAllNotificationsModal;
