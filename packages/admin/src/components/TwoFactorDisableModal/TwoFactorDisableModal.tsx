import { type Component, createEffect, on } from "solid-js";
import Modal from "@/components/Modal/Modal";
import TwoFactorProofStep from "@/components/TwoFactorProofStep/TwoFactorProofStep";
import api from "@/services/api";
import T from "@/translations";

interface TwoFactorDisableModalProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const TwoFactorDisableModal: Component<TwoFactorDisableModalProps> = (
	props,
) => {
	// ----------------------------------------
	// Mutations
	const disable = api.account.useDisableTwoFactor({
		onSuccess: () => props.state.setOpen(false),
	});

	// ----------------------------------------
	// Effects
	createEffect(
		on(
			() => props.state.open,
			(open) => {
				if (open) disable.reset();
			},
		),
	);

	// ----------------------------------------
	// Render
	return (
		<Modal.Root open={props.state.open} onOpenChange={props.state.setOpen}>
			<TwoFactorProofStep
				title={T()("modals.account.two.factor.disable.title")}
				description={T()("modals.account.two.factor.disable.description")}
				submitLabel={T()("modals.account.two.factor.disable.submit")}
				submitVariant="danger"
				isLoading={disable.action.isPending}
				errors={disable.errors}
				onSubmit={(proof) => disable.action.mutate(proof)}
				onCancel={() => props.state.setOpen(false)}
			/>
		</Modal.Root>
	);
};

export default TwoFactorDisableModal;
