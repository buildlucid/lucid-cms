import T from "@/translations";
import { type Component, createSignal, createMemo, Show } from "solid-js";
import { getBodyError } from "@/utils/error-helpers";
import helpers from "@/utils/helpers";
import api from "@/services/api";
import { Form, Input } from "@/components/Groups/Form";

interface UpdateAccountFormProps {
	firstName: string | undefined;
	lastName: string | undefined;
	username: string | undefined;
	email: string | undefined;
}

const UpdateAccountForm: Component<UpdateAccountFormProps> = (props) => {
	// ----------------------------------------
	// State
	const [firstName, setFirstName] = createSignal(props.firstName);
	const [lastName, setLastName] = createSignal(props.lastName);
	const [username, setUsername] = createSignal(props.username ?? "");
	const [email, setEmail] = createSignal(props.email ?? "");

	// ----------------------------------------
	// Mutations
	const updateMe = api.account.useUpdateMe();

	// ----------------------------------------
	// Memos
	const updateData = createMemo(() => {
		return helpers.updateData(
			{
				firstName: props.firstName,
				lastName: props.lastName,
				username: props.username,
				email: props.email,
			},
			{
				firstName: firstName(),
				lastName: lastName(),
				username: username(),
				email: email(),
			},
		);
	});
	const submitIsDisabled = createMemo(() => {
		return !updateData().changed;
	});

	// ----------------------------------------
	// Render
	return (
		<Form
			state={{
				isLoading: updateMe.action.isPending,
				errors: updateMe.errors(),
				isDisabled: submitIsDisabled(),
			}}
			content={{
				submit: T()("update"),
			}}
			options={{
				hideSubmitWhenDisabled: true,
			}}
			onSubmit={() => {
				updateMe.action.mutate(updateData().data);
			}}
		>
			<div class="grid grid-cols-2 gap-4">
				<Input
					id="firstName"
					name="firstName"
					type="text"
					value={firstName() ?? ""}
					onChange={setFirstName}
					copy={{
						label: T()("first_name"),
					}}
					errors={getBodyError("firstName", updateMe.errors)}
				/>
				<Input
					id="lastName"
					name="lastName"
					type="text"
					value={lastName() ?? ""}
					onChange={setLastName}
					copy={{
						label: T()("last_name"),
					}}
					errors={getBodyError("lastName", updateMe.errors)}
				/>
			</div>
			<Input
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
			/>
			<Input
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
			/>
		</Form>
	);
};

export default UpdateAccountForm;
