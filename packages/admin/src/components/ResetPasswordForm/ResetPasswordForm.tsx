import { type Component, createSignal } from "solid-js";
import CaptchaWidget from "@/components/CaptchaWidget/CaptchaWidget";
import { Form } from "@/components/Form/Form";
import { InsetLabelInput } from "@/components/InsetLabelInput/InsetLabelInput";
import { useCaptcha } from "@/hooks/useCaptcha/useCaptcha";
import api from "@/services/api";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";

interface ResetPasswordFormProps {
	token: string;
}

const ResetPasswordForm: Component<ResetPasswordFormProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const captcha = useCaptcha("resetPassword");
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
				isLoading: resetPassword.action.isPending || captcha.isPending(),
				errors: resetPassword.errors(),
			}}
			content={{
				submit: T()("actions.reset.password"),
			}}
			options={{
				buttonFullWidth: true,
				buttonSize: "lg",
				submitSpacing: "lg",
				disableErrorMessage: true,
			}}
			onSubmit={() => {
				void captcha.submit((captchaToken) =>
					resetPassword.action.mutateAsync({
						token: props.token,
						password: password(),
						passwordConfirmation: passwordConfirmation(),
						captchaToken,
					}),
				);
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
				autofocus={true}
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
			<CaptchaWidget captcha={captcha} />
		</Form>
	);
};

export default ResetPasswordForm;
