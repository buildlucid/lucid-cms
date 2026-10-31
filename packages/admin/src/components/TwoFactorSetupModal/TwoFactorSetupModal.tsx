import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Match,
	on,
	Switch,
} from "solid-js";
import Button from "@/components/Button/Button";
import ConfirmActionButton from "@/components/ConfirmActionButton/ConfirmActionButton";
import Input from "@/components/Input/Input";
import Modal from "@/components/Modal/Modal";
import RecoveryCodesList from "@/components/RecoveryCodesList/RecoveryCodesList";
import TwoFactorProofStep from "@/components/TwoFactorProofStep/TwoFactorProofStep";
import TwoFactorSetupPanel from "@/components/TwoFactorSetupPanel/TwoFactorSetupPanel";
import constants from "@/constants";
import api from "@/services/api";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";

interface TwoFactorSetupModalProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	/** Replacing an app that's already set up starts by asking for a code from it. */
	replacing: boolean;
}

type SetupStep = "proof" | "scan" | "codes";

/**
 * Sets up an authenticator app from the account page, or swaps it for a new one, ending on the new
 * recovery codes.
 */
const TwoFactorSetupModal: Component<TwoFactorSetupModalProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [step, setStep] = createSignal<SetupStep>("scan");
	const [code, setCode] = createSignal("");
	const [recoveryCodes, setRecoveryCodes] = createSignal<string[]>([]);

	// ----------------------------------------
	// Mutations
	const start = api.account.useStartTwoFactorSetup({
		onSuccess: () => setStep("scan"),
	});
	const confirm = api.account.useConfirmTwoFactor({
		onSuccess: (res) => {
			setRecoveryCodes(res.data.recoveryCodes);
			setStep("codes");
		},
		onError: () => setCode(""),
	});

	// ----------------------------------------
	// Memos
	const digits = createMemo(() => code().replace(/\D/g, ""));

	// ----------------------------------------
	// Functions
	const submitCode = (value: string) => {
		const cleaned = value.replace(/\D/g, "");
		if (cleaned.length !== constants.twoFactor.codeLength) return;
		if (confirm.action.isPending || !start.action.data) return;
		confirm.action.mutate({ code: cleaned });
	};

	// ----------------------------------------
	// Effects
	createEffect(
		on(
			() => props.state.open,
			(open) => {
				if (!open) return;
				start.reset();
				confirm.reset();
				setCode("");
				setRecoveryCodes([]);
				setStep(props.replacing ? "proof" : "scan");
				if (!props.replacing) start.action.mutate({});
			},
		),
	);

	// ----------------------------------------
	// Render
	return (
		<Modal.Root
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			role={step() === "codes" ? "alertdialog" : undefined}
			//* closing mid-request could lose a used code's result or the new recovery codes
			dismissible={
				step() !== "codes" &&
				!start.action.isPending &&
				!confirm.action.isPending
			}
		>
			<Switch>
				<Match when={step() === "proof"}>
					<TwoFactorProofStep
						title={T()("modals.account.two.factor.replace.title")}
						description={T()("modals.account.two.factor.replace.description")}
						submitLabel={T()("common.continue")}
						isLoading={start.action.isPending}
						errors={start.errors}
						onSubmit={(proof) => start.action.mutate(proof)}
						onCancel={() => props.state.setOpen(false)}
					/>
				</Match>
				<Match when={step() === "scan"}>
					<form
						class="w-full"
						onSubmit={(event) => {
							event.preventDefault();
							submitCode(code());
						}}
					>
						<Modal.Header>
							<Modal.Title>
								{props.replacing
									? T()("modals.account.two.factor.setup.replace.title")
									: T()("modals.account.two.factor.setup.title")}
							</Modal.Title>
							<Modal.Description>
								{T()("modals.account.two.factor.setup.description")}
							</Modal.Description>
						</Modal.Header>
						<Modal.Body>
							<TwoFactorSetupPanel
								setup={start.action.data?.data}
								failed={start.action.isError}
								onRetry={() => start.action.mutate({})}
							/>
							<Input
								id="code"
								name="code"
								type="text"
								class="mt-5"
								label={T()("auth.two.factor.code.label")}
								value={code()}
								onChange={(value) => {
									setCode(value);
									submitCode(value);
								}}
								inputmode="numeric"
								autocomplete="one-time-code"
								required={true}
								disabled={!start.action.data}
								errors={getBodyError("code", confirm.errors)}
							/>
						</Modal.Body>
						<Modal.Footer>
							<Modal.Actions>
								<Button
									type="button"
									variant="outline"
									size="md"
									disabled={confirm.action.isPending}
									onClick={() => props.state.setOpen(false)}
								>
									{T()("common.cancel")}
								</Button>
								<Button
									type="submit"
									variant="primary"
									size="md"
									loading={confirm.action.isPending}
									disabled={
										digits().length !== constants.twoFactor.codeLength ||
										!start.action.data
									}
								>
									{props.replacing
										? T()("modals.account.two.factor.setup.replace.submit")
										: T()("modals.account.two.factor.setup.submit")}
								</Button>
							</Modal.Actions>
						</Modal.Footer>
					</form>
				</Match>
				<Match when={step() === "codes"}>
					<Modal.Header>
						<Modal.Title>
							{T()("modals.account.two.factor.codes.title")}
						</Modal.Title>
						<Modal.Description>
							{T()("modals.account.two.factor.codes.description")}
						</Modal.Description>
					</Modal.Header>
					<Modal.Body>
						<RecoveryCodesList codes={recoveryCodes()} />
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
				</Match>
			</Switch>
		</Modal.Root>
	);
};

export default TwoFactorSetupModal;
