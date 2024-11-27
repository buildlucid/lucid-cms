import T from "@/translations";
import { type Component, createSignal, createMemo, Show } from "solid-js";
import { getBodyError } from "@/utils/error-helpers";
import helpers from "@/utils/helpers";
import api from "@/services/api";
import Form from "@/components/Groups/Form";

interface UpdateAccountFormProps {
	firstName: string | undefined;
	lastName: string | undefined;
	username: string | undefined;
	email: string | undefined;
}

const UpdateAccountForm: Component<UpdateAccountFormProps> = (props) => {
	// ----------------------------------------
	// State
	const [firstName, setFirstName] = createSignal(props.firstName ?? "");
	const [lastName, setLastName] = createSignal(props.lastName ?? "");
	const [username, setUsername] = createSignal(props.username ?? "");
	const [email, setEmail] = createSignal(props.email ?? "");
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
		},
	});

	// ----------------------------------------
	// Memos
	const updateData = createMemo(() => {
		return helpers.updateData(
			{
				firstName: props.firstName,
				lastName: props.lastName,
				username: props.username,
				email: props.email,
				currentPassword: "",
				newPassword: "",
				passwordConfirmation: "",
			},
			{
				firstName: firstName(),
				lastName: lastName(),
				username: username(),
				email: email(),
				currentPassword: currentPassword(),
				newPassword: newPassword(),
				passwordConfirmation: confirmPassword(),
			},
		);
	});
	const submitIsDisabled = createMemo(() => {
		return !updateData().changed;
	});

	// ----------------------------------------
	// Render
	return (
		<Form.Root
			state={{
				isLoading: updateMe.action.isPending,
				errors: updateMe.errors(),
				isDisabled: submitIsDisabled(),
			}}
			content={{
				submit: T()("update"),
			}}
			onSubmit={() => {
				updateMe.action.mutate(updateData().data);
			}}
		>
			<h3 class="mb-15">{T()("details")}</h3>
			<div class="grid grid-cols-2 gap-15">
				<Form.Input
					id="firstName"
					name="firstName"
					type="text"
					value={firstName()}
					onChange={setFirstName}
					copy={{
						label: T()("first_name"),
					}}
					errors={getBodyError("firstName", updateMe.errors)}
					theme="full"
				/>
				<Form.Input
					id="lastName"
					name="lastName"
					type="text"
					value={lastName()}
					onChange={setLastName}
					copy={{
						label: T()("last_name"),
					}}
					errors={getBodyError("lastName", updateMe.errors)}
					theme="full"
				/>
			</div>
			<Form.Input
				id="username"
				name="username"
				type="text"
				value={username()}
				onChange={setUsername}
				copy={{
					label: T()("username"),
				}}
				required={true}
				errors={getBodyError("username", updateMe.errors)}
				theme="full"
			/>
			<Form.Input
				id="email"
				name="email"
				type="email"
				value={email()}
				onChange={setEmail}
				copy={{
					label: T()("email"),
				}}
				required={true}
				errors={getBodyError("email", updateMe.errors)}
				theme="full"
			/>
			<div class="mt-30">
				<h3 class="mb-15">{T()("update_password")}</h3>
				<Form.Input
					id="currentPassword"
					name="currentPassword"
					type="password"
					value={currentPassword()}
					onChange={setCurrentPassword}
					copy={{
						label: T()("current_password"),
					}}
					errors={getBodyError("currentPassword", updateMe.errors)}
					theme="full"
				/>
				<Form.Input
					id="newPassword"
					name="newPassword"
					type="password"
					value={newPassword()}
					onChange={setNewPassword}
					copy={{
						label: T()("new_password"),
					}}
					errors={getBodyError("newPassword", updateMe.errors)}
					theme="full"
				/>
				<Show when={newPassword() !== ""}>
					<Form.Input
						id="passwordConfirmation"
						name="passwordConfirmation"
						type="password"
						value={confirmPassword()}
						onChange={setConfirmPassword}
						copy={{
							label: T()("confirm_password"),
						}}
						errors={getBodyError("passwordConfirmation", updateMe.errors)}
						theme="full"
					/>
				</Show>
			</div>
		</Form.Root>
	);
};

export default UpdateAccountForm;
