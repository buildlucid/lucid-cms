import { type Component, createMemo, createSignal, Show } from "solid-js";
import Button from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";

interface UpdatePasswordModalProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	options?: {
		forced?: boolean;
	};
	callbacks?: {
		onSuccess?: () => void;
	};
}

const UpdatePasswordModal: Component<UpdatePasswordModalProps> = (props) => {
	// ----------------------------------------
	// State
	const [currentPassword, setCurrentPassword] = createSignal("");
	const [newPassword, setNewPassword] = createSignal("");
	const [confirmPassword, setConfirmPassword] = createSignal("");

	// ----------------------------------------
	// Mutations
	const updateMe = api.account.useUpdateMe({
		onSuccess: () => {
			setCurrentPassword("");
			setNewPassword("");
			setConfirmPassword("");
			props.callbacks?.onSuccess?.();
			props.state.setOpen(false);
		},
	});

	// ----------------------------------------
	// Memos
	const forced = createMemo(() => props.options?.forced === true);
	const submitDisabled = createMemo(() => {
		const hasValues =
			currentPassword().length > 0 &&
			newPassword().length >= 1 &&
			confirmPassword().length >= 1;
		const matches = newPassword() === confirmPassword();
		return !hasValues || !matches;
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Root
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			dismissible={!forced()}
		>
			<form
				class="w-full"
				onSubmit={(e) => {
					e.preventDefault();
					updateMe.action.mutate({
						currentPassword: currentPassword(),
						newPassword: newPassword(),
						passwordConfirmation: confirmPassword(),
					});
				}}
			>
				<Modal.Header>
					<Modal.Title>
						{forced()
							? T()("auth.password.reset.required.title")
							: T()("actions.update.password")}
					</Modal.Title>
					<Modal.Description>
						{forced()
							? T()("auth.password.reset.required.message")
							: T()("auth.password.description")}
					</Modal.Description>
				</Modal.Header>
				<Modal.Body class="flex flex-col gap-3">
					<Input
						id="currentPassword"
						name="currentPassword"
						type="password"
						value={currentPassword()}
						onChange={setCurrentPassword}
						label={T()("common.current.password")}
						errors={getBodyError("currentPassword", updateMe.errors)}
					/>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Input
							id="newPassword"
							name="newPassword"
							type="password"
							value={newPassword()}
							onChange={setNewPassword}
							label={T()("common.new.password")}
							errors={getBodyError("newPassword", updateMe.errors)}
						/>
						<Input
							id="passwordConfirmation"
							name="passwordConfirmation"
							type="password"
							value={confirmPassword()}
							onChange={setConfirmPassword}
							label={T()("common.confirm.password")}
							errors={getBodyError("passwordConfirmation", updateMe.errors)}
						/>
					</div>
					<ErrorMessage
						theme="basic"
						message={updateMe.errors()?.message}
						classes="mt-4"
					/>
				</Modal.Body>
				<Modal.Footer>
					<Modal.Actions>
						<Show when={!forced()}>
							<Button
								type="button"
								variant="outline"
								size="md"
								disabled={updateMe.action.isPending}
								onClick={() => props.state.setOpen(false)}
							>
								{T()("common.cancel")}
							</Button>
						</Show>
						<Button
							type="submit"
							variant="primary"
							size="md"
							loading={updateMe.action.isPending}
							disabled={submitDisabled()}
						>
							{T()("common.update")}
						</Button>
					</Modal.Actions>
				</Modal.Footer>
			</form>
		</Modal.Root>
	);
};

export default UpdatePasswordModal;
