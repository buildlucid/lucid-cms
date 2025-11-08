import T from "@/translations";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import { Modal } from "@/components/Groups/Modal";
import { Form, Input } from "@/components/Groups/Form";
import { getBodyError } from "@/utils/error-helpers";
import api from "@/services/api";

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
		>
			<div class="border-b border-border pb-4 mb-4">
				<h2>{T()("update_password")}</h2>
				<p class="mt-1">{T()("password_description")}</p>
			</div>
			<Form
				state={{
					isLoading: updateMe.action.isPending,
					errors: updateMe.errors(),
					isDisabled: submitDisabled(),
				}}
				content={{
					submit: T()("update"),
				}}
				onSubmit={() => {
					updateMe.action.mutate({
						currentPassword: currentPassword(),
						newPassword: newPassword(),
						passwordConfirmation: confirmPassword(),
					});
				}}
			>
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
			</Form>
		</Modal>
	);
};

export default UpdatePasswordModal;
