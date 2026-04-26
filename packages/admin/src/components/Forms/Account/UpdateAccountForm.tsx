import type { User } from "@types";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import { Form, Input } from "@/components/Groups/Form";
import api from "@/services/api";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";
import helpers from "@/utils/helpers";

interface UpdateAccountFormProps {
	firstName: string | undefined;
	lastName: string | undefined;
	username: string | undefined;
	email: string | undefined;
	pendingEmailChange?: User["pendingEmailChange"];
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
	const updateMe = api.account.useUpdateMe({
		onSuccess: (_data, params) => {
			if (params.email !== undefined) {
				setEmail(props.email ?? "");
			}
		},
	});
	const cancelEmailChange = api.account.useCancelEmailChange();

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
			<Show when={props.pendingEmailChange}>
				{(pendingEmailChange) => (
					<p class="mt-2 text-sm text-body">
						{T()("pending_email_change_description", {
							email: pendingEmailChange().email,
						})}{" "}
						<button
							type="button"
							class="text-body underline underline-offset-2 transition-colors hover:text-title disabled:cursor-not-allowed disabled:opacity-60"
							disabled={cancelEmailChange.action.isPending}
							onClick={() => cancelEmailChange.action.mutate({})}
						>
							{T()("cancel")}
						</button>
					</p>
				)}
			</Show>
		</Form>
	);
};

export default UpdateAccountForm;
