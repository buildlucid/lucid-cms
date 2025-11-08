import { type Component, createSignal } from "solid-js";
import { Form, InputFull } from "@/components/Groups/Form";
import api from "@/services/api";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";

interface ResetPasswordFormProps {
	token: string;
}

const ResetPasswordForm: Component<ResetPasswordFormProps> = (props) => {
	// ----------------------------------------
	// State
	const [password, setPassword] = createSignal("");
	const [passwordConfirmation, setPasswordConfirmation] = createSignal("");

	// ----------------------------------------
	// Mutations
	const resetPassword = api.account.useResetPassword();

	// ----------------------------------------
	// Render
	return (
		<Form
			state={{
				isLoading: resetPassword.action.isPending,
				errors: resetPassword.errors(),
			}}
			content={{
				submit: T()("reset_password"),
			}}
			options={{
				buttonFullWidth: true,
				buttonSize: "large",
				disableErrorMessage: true,
			}}
			onSubmit={() => {
				resetPassword.action.mutate({
					token: props.token,
					password: password(),
					passwordConfirmation: passwordConfirmation(),
				});
			}}
		>
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
				autoFoucs={true}
				errors={getBodyError("password", resetPassword.errors)}
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
				errors={getBodyError("passwordConfirmation", resetPassword.errors)}
			/>
		</Form>
	);
};

export default ResetPasswordForm;
