import { type Component, createMemo, createSignal } from "solid-js";
import { Input } from "@/components/Groups/Form";
import { Modal, ModalFooter } from "@/components/Groups/Modal";
import Button from "@/components/Partials/Button";
import ErrorMessage from "@/components/Partials/ErrorMessage";
import api from "@/services/api";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";

interface UpdatePasswordModalProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
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
			props.state.setOpen(false);
		},
	});

	// ----------------------------------------
	// Memos
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
		<Modal
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			options={{
				noPadding: true,
			}}
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
				<div class="p-4 md:p-6">
					<div class="mb-4">
						<h2>{T()("update_password")}</h2>
						<p class="mt-1">{T()("password_description")}</p>
					</div>
					<Input
						id="currentPassword"
						name="currentPassword"
						type="password"
						value={currentPassword()}
						onChange={setCurrentPassword}
						copy={{
							label: T()("current_password"),
						}}
						errors={getBodyError("currentPassword", updateMe.errors)}
						hideOptionalText={true}
					/>
					<div class="grid grid-cols-2 gap-4">
						<Input
							id="newPassword"
							name="newPassword"
							type="password"
							value={newPassword()}
							onChange={setNewPassword}
							copy={{
								label: T()("new_password"),
							}}
							errors={getBodyError("newPassword", updateMe.errors)}
							hideOptionalText={true}
							noMargin={true}
						/>
						<Input
							id="passwordConfirmation"
							name="passwordConfirmation"
							type="password"
							value={confirmPassword()}
							onChange={setConfirmPassword}
							copy={{
								label: T()("confirm_password"),
							}}
							errors={getBodyError("passwordConfirmation", updateMe.errors)}
							hideOptionalText={true}
							noMargin={true}
						/>
					</div>
					<ErrorMessage
						theme="basic"
						message={updateMe.errors()?.message}
						classes="mt-4"
					/>
				</div>
				<ModalFooter>
					<div />
					<div class="flex gap-2.5">
						<Button
							type="button"
							theme="border-outline"
							size="medium"
							disabled={updateMe.action.isPending}
							onClick={() => props.state.setOpen(false)}
						>
							{T()("cancel")}
						</Button>
						<Button
							type="submit"
							theme="primary"
							size="medium"
							loading={updateMe.action.isPending}
							disabled={submitDisabled()}
						>
							{T()("update")}
						</Button>
					</div>
				</ModalFooter>
			</form>
		</Modal>
	);
};

export default UpdatePasswordModal;
