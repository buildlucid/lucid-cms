import { type Component, createSignal } from "solid-js";
import { Form } from "@/components/Form/Form";
import { InsetLabelInput } from "@/components/InsetLabelInput/InsetLabelInput";
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
				submit: T()("actions.reset.password"),
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
			<InsetLabelInput
				id="password"
				name="password"
				type="password"
				value={password()}
				onChange={setPassword}
				copy={{
					label: T()("common.password"),
				}}
				required={true}
				autoFoucs={true}
				errors={getBodyError("password", resetPassword.errors)}
			/>
			<InsetLabelInput
				id="passwordConfirmation"
				name="passwordConfirmation"
				type="password"
				value={passwordConfirmation()}
				onChange={setPasswordConfirmation}
				copy={{
					label: T()("common.confirm.password"),
				}}
				required={true}
				errors={getBodyError("passwordConfirmation", resetPassword.errors)}
			/>
		</Form>
	);
};

export default ResetPasswordForm;
