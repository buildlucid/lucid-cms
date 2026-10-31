import type { Accessor, Component } from "solid-js";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

interface ResetPasskeysModalProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const ResetPasskeysModal: Component<ResetPasskeysModalProps> = (props) => {
	// ----------------------------------------
	// Mutations
	const resetPasskeys = api.users.useResetPasskeys({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.users.passkeys.reset.title")}
			description={T()("modals.users.passkeys.reset.description")}
			confirmLabel={T()("modals.users.passkeys.reset.confirm")}
			confirmVariant="danger"
			loading={resetPasskeys.action.isPending}
			error={resetPasskeys.errors()?.message}
			onConfirm={() => {
				const id = props.id();
				if (!id) return console.error("No id provided");
				resetPasskeys.action.mutate({
					id: id,
				});
			}}
			onCancel={() => {
				props.state.setOpen(false);
				resetPasskeys.reset();
			}}
		/>
	);
};

export default ResetPasskeysModal;
