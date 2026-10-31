import type { Passkey } from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	on,
} from "solid-js";
import Button from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import Input from "@/components/Input/Input";
import Modal from "@/components/Modal/Modal";
import constants from "@/constants";
import api from "@/services/api";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";

interface RenamePasskeyModalProps {
	passkey: Passkey | undefined;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

const RenamePasskeyModal: Component<RenamePasskeyModalProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [name, setName] = createSignal("");

	// ----------------------------------------
	// Mutations
	const updatePasskey = api.account.useUpdatePasskey({
		onSuccess: () => props.state.setOpen(false),
	});

	// ----------------------------------------
	// Memos
	const submitIsDisabled = createMemo(() => {
		const value = name().trim();
		return value.length === 0 || value === props.passkey?.name;
	});

	// ----------------------------------------
	// Effects
	createEffect(
		on(
			() => props.state.open,
			(open) => {
				if (!open) return;
				setName(props.passkey?.name ?? "");
				updatePasskey.reset();
			},
		),
	);

	// ----------------------------------------
	// Render
	return (
		<Modal.Root open={props.state.open} onOpenChange={props.state.setOpen}>
			<form
				class="w-full"
				onSubmit={(event) => {
					event.preventDefault();
					const passkey = props.passkey;
					if (!passkey || submitIsDisabled()) return;
					updatePasskey.action.mutate({
						id: passkey.id,
						body: { name: name().trim() },
					});
				}}
			>
				<Modal.Header>
					<Modal.Title>
						{T()("modals.account.passkey.rename.title")}
					</Modal.Title>
					<Modal.Description>
						{T()("modals.account.passkey.rename.description")}
					</Modal.Description>
				</Modal.Header>
				<Modal.Body class="flex flex-col gap-3">
					<Input
						id="passkey-name"
						name="name"
						type="text"
						value={name()}
						onChange={setName}
						label={T()("common.name")}
						required={true}
						autofocus={true}
						maxLength={constants.passkeys.nameMaxLength}
						errors={getBodyError("name", updatePasskey.errors)}
					/>
					<ErrorMessage
						theme="basic"
						message={updatePasskey.errors()?.message}
					/>
				</Modal.Body>
				<Modal.Footer>
					<Modal.Actions>
						<Button
							type="button"
							variant="outline"
							size="md"
							disabled={updatePasskey.action.isPending}
							onClick={() => props.state.setOpen(false)}
						>
							{T()("common.cancel")}
						</Button>
						<Button
							type="submit"
							variant="primary"
							size="md"
							loading={updatePasskey.action.isPending}
							disabled={submitIsDisabled()}
						>
							{T()("common.save")}
						</Button>
					</Modal.Actions>
				</Modal.Footer>
			</form>
		</Modal.Root>
	);
};

export default RenamePasskeyModal;
