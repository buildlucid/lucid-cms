import type { Accessor, Component } from "solid-js";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";

interface ResetTwoFactorModalProps {
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const ResetTwoFactorModal: Component<ResetTwoFactorModalProps> = (props) => {
	// ----------------------------------------
	// Mutations
	const resetTwoFactor = api.users.useResetTwoFactor({
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
			title={T()("modals.users.two.factor.reset.title")}
			description={T()("modals.users.two.factor.reset.description")}
			confirmLabel={T()("modals.users.two.factor.reset.confirm")}
			confirmVariant="danger"
			loading={resetTwoFactor.action.isPending}
			error={resetTwoFactor.errors()?.message}
			onConfirm={() => {
				const id = props.id();
				if (!id) return console.error("No id provided");
				resetTwoFactor.action.mutate({
					id: id,
				});
			}}
			onCancel={() => {
				props.state.setOpen(false);
				resetTwoFactor.reset();
			}}
		/>
	);
};

export default ResetTwoFactorModal;
