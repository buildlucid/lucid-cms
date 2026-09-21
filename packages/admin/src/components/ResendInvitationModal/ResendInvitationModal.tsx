import type { Accessor, Component } from "solid-js";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

const ResendInvitationModal: Component<{
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}> = (props) => {
	const resendInvitation = api.users.useResendInvitation({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});

	return (
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.users.resend.invitation.title")}
			description={T()("modals.users.resend.invitation.description")}
			confirmVariant="primary"
			loading={resendInvitation.action.isPending}
			error={resendInvitation.errors()?.message}
			onConfirm={() => {
				const id = props.id();
				if (!id) {
					console.error("No id provided for resend invitation");
					return;
				}
				resendInvitation.action.mutate({
					userId: id,
				});
			}}
			onCancel={() => {
				props.state.setOpen(false);
				resendInvitation.reset();
			}}
		/>
	);
};

export default ResendInvitationModal;
