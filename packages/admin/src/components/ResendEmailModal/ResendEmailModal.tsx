import type { Accessor, Component } from "solid-js";
import { Modal } from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

interface ResendEmailProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const ResendEmailModal: Component<ResendEmailProps> = (props) => {
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
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.common.resend.email.title")}
			description={T()("modals.common.resend.email.description")}
			confirmVariant="primary"
			loading={resendEmail.action.isPending}
			error={resendEmail.errors()?.message}
			onConfirm={() => {
				const id = props.id();
				if (!id) return console.error("No id provided");
				resendEmail.action.mutate({
					id: id,
				});
			}}
			onCancel={() => {
				props.state.setOpen(false);
				resendEmail.reset();
			}}
		/>
	);
};

export default ResendEmailModal;
