import { type Component, createEffect, createSignal, on, Show } from "solid-js";
import ConfirmActionButton from "@/components/ConfirmActionButton/ConfirmActionButton";
import Modal from "@/components/Modal/Modal";
import RecoveryCodesList from "@/components/RecoveryCodesList/RecoveryCodesList";
import TwoFactorProofStep from "@/components/TwoFactorProofStep/TwoFactorProofStep";
import api from "@/services/api";
import T from "@/translations";

interface TwoFactorRecoveryCodesModalProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

/** Replaces recovery codes after verifying an authenticator or recovery code. */
const TwoFactorRecoveryCodesModal: Component<
	TwoFactorRecoveryCodesModalProps
> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [recoveryCodes, setRecoveryCodes] = createSignal<string[]>();

	// ----------------------------------------
	// Mutations
	const regenerate = api.account.useRegenerateRecoveryCodes({
		onSuccess: (res) => setRecoveryCodes(res.data.recoveryCodes),
	});

	// ----------------------------------------
	// Effects
	createEffect(
		on(
			() => props.state.open,
			(open) => {
				if (!open) return;
				regenerate.reset();
				setRecoveryCodes(undefined);
			},
		),
	);

	// ----------------------------------------
	// Render
	return (
		<Modal.Root
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			role={recoveryCodes() ? "alertdialog" : undefined}
			//* closing mid-request would lose the new codes, and the old ones no longer work
			dismissible={
				recoveryCodes() === undefined && !regenerate.action.isPending
			}
		>
			<Show
				when={recoveryCodes()}
				fallback={
					<TwoFactorProofStep
						title={T()("modals.account.two.factor.recovery.title")}
						description={T()("modals.account.two.factor.recovery.description")}
						submitLabel={T()("modals.account.two.factor.recovery.submit")}
						isLoading={regenerate.action.isPending}
						errors={regenerate.errors}
						onSubmit={(proof) => regenerate.action.mutate(proof)}
						onCancel={() => props.state.setOpen(false)}
					/>
				}
			>
				{(codes) => (
					<>
						<Modal.Header>
							<Modal.Title>
								{T()("modals.account.two.factor.codes.title")}
							</Modal.Title>
							<Modal.Description>
								{T()("modals.account.two.factor.codes.replaced.description")}
							</Modal.Description>
						</Modal.Header>
						<Modal.Body>
							<RecoveryCodesList codes={codes()} />
						</Modal.Body>
						<Modal.Footer>
							<Modal.Actions>
								<ConfirmActionButton
									onConfirm={() => props.state.setOpen(false)}
									confirmationText={T()(
										"common.confirmations.click.again.to.close",
									)}
								>
									{T()("auth.two.factor.recovery.codes.saved")}
								</ConfirmActionButton>
							</Modal.Actions>
						</Modal.Footer>
					</>
				)}
			</Show>
		</Modal.Root>
	);
};

export default TwoFactorRecoveryCodesModal;
