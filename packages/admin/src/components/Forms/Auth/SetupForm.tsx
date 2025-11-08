import { type Component, createSignal } from "solid-js";
import { Form, InputFull } from "@/components/Groups/Form";
import api from "@/services/api";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";

const SetupForm: Component = () => {
	// ----------------------------------------
	// State
	const [email, setEmail] = createSignal("");
	const [username, setUsername] = createSignal("");
	const [firstName, setFirstName] = createSignal("");
	const [lastName, setLastName] = createSignal("");
	const [password, setPassword] = createSignal("");
	const [passwordConfirmation, setPasswordConfirmation] = createSignal("");

	// ----------------------------------------
	// Mutations
	const setup = api.auth.useSetup();

	// ----------------------------------------
	// Render
	return (
		<Form
			state={{
				isLoading: setup.action.isPending,
				errors: setup.errors(),
			}}
			content={{
				submit: T()("create_initial_admin"),
			}}
			options={{
				buttonFullWidth: true,
				buttonSize: "large",
				disableErrorMessage: true,
			}}
			onSubmit={() => {
				setup.action.mutate({
					email: email(),
					username: username(),
					firstName: firstName() || undefined,
					lastName: lastName() || undefined,
					password: password(),
				});
			}}
		>
			<div class="grid grid-cols-2 gap-4">
				<InputFull
					id="firstName"
					name="firstName"
					type="text"
					value={firstName()}
					onChange={setFirstName}
					copy={{
						label: T()("first_name"),
					}}
					autoFoucs={true}
					errors={getBodyError("firstName", setup.errors)}
				/>
				<InputFull
					id="lastName"
					name="lastName"
					type="text"
					value={lastName()}
					onChange={setLastName}
					copy={{
						label: T()("last_name"),
					}}
					errors={getBodyError("lastName", setup.errors)}
				/>
			</div>
			<InputFull
				id="username"
				name="username"
				type="text"
				value={username()}
				onChange={setUsername}
				copy={{
					label: T()("username"),
				}}
				required={true}
				errors={getBodyError("username", setup.errors)}
			/>
			<InputFull
				id="email"
				name="email"
				type="email"
				value={email()}
				onChange={setEmail}
				copy={{
					label: T()("email"),
				}}
				required={true}
				autoComplete="email"
				errors={getBodyError("email", setup.errors)}
			/>
			<InputFull
				id="password"
				name="password"
				type="password"
				value={password()}
				onChange={setPassword}
				copy={{
					label: T()("password"),
				}}
				required={true}
				autoComplete="new-password"
				errors={getBodyError("password", setup.errors)}
			/>
			<InputFull
				id="passwordConfirmation"
				name="passwordConfirmation"
				type="password"
				value={passwordConfirmation()}
				onChange={setPasswordConfirmation}
				copy={{
					label: T()("confirm_password"),
				}}
				required={true}
				autoComplete="new-password"
				errors={getBodyError("passwordConfirmation", setup.errors)}
			/>
		</Form>
	);
};

export default SetupForm;
