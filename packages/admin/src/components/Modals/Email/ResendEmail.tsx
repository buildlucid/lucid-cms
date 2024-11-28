import T from "@/translations";
import type { Component, Accessor } from "solid-js";
import { Confirmation } from "@/components/Groups/Modal";
import api from "@/services/api";

interface ResendEmailProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const ResendEmail: Component<ResendEmailProps> = (props) => {
	// ----------------------------------------
	// Mutations
	const resendEmail = api.email.useResendSingle({
		onSuccess: () => {
			props.state.setOpen(false);
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
				isLoading: resendEmail.action.isPending,
				isError: resendEmail.action.isError,
			}}
			copy={{
				title: T()("resend_email_modal_title"),
				description: T()("resend_email_modal_description"),
				error: resendEmail.errors()?.message,
			}}
			callbacks={{
				onConfirm: () => {
					const id = props.id();
					if (!id) return console.error("No id provided");
					resendEmail.action.mutate({
						id: id,
					});
				},
				onCancel: () => {
					props.state.setOpen(false);
					resendEmail.reset();
				},
			}}
		/>
	);
};

export default ResendEmail;
