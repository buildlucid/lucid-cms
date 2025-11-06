import T from "@/translations";
import type { Component, Accessor } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";

const ResendInvitation: Component<{
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
		<Confirmation
			theme="primary"
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
				isLoading: resendInvitation.action.isPending,
				isError: resendInvitation.action.isError,
			}}
			copy={{
				title: T()("user_resend_invitation_modal_title"),
				description: T()("user_resend_invitation_modal_description"),
				error: resendInvitation.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					const id = props.id();
					if (!id) {
						console.error("No id provided for resend invitation");
						return;
					}
					resendInvitation.action.mutate({
						userId: id,
					});
				},
				onCancel: () => {
					props.state.setOpen(false);
					resendInvitation.reset();
				},
			}}
		/>
	);
};

export default ResendInvitation;
