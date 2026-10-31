import { type Component, createSignal } from "solid-js";
import CaptchaWidget from "@/components/CaptchaWidget/CaptchaWidget";
import { Form } from "@/components/Form/Form";
import { InsetLabelInput } from "@/components/InsetLabelInput/InsetLabelInput";
import { useCaptcha } from "@/hooks/useCaptcha/useCaptcha";
import api from "@/services/api";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";

interface AcceptInvitationFormProps {
	token: string;
}

const AcceptInvitationForm: Component<AcceptInvitationFormProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const captcha = useCaptcha("acceptInvitation");
	const [password, setPassword] = createSignal("");
	const [passwordConfirmation, setPasswordConfirmation] = createSignal("");

	// ----------------------------------------
	// Mutations
	const acceptInvitation = api.auth.useAcceptInvitation();

	// ----------------------------------------
	// Render
	return (
		<Form
			state={{
				isLoading: acceptInvitation.action.isPending || captcha.isPending(),
				errors: acceptInvitation.errors(),
			}}
			content={{
				submit: T()("auth.invitations.accept.action"),
			}}
			options={{
				buttonFullWidth: true,
				buttonSize: "lg",
				disableErrorMessage: true,
			}}
			onSubmit={() => {
				void captcha.submit((captchaToken) =>
					acceptInvitation.action.mutateAsync({
						token: props.token,
						body: {
							password: password(),
							passwordConfirmation: passwordConfirmation(),
						},
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
				autoFoucs={true}
				autoComplete="new-password"
				errors={getBodyError("password", acceptInvitation.errors)}
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
				autoComplete="new-password"
				errors={getBodyError("passwordConfirmation", acceptInvitation.errors)}
			/>
			<CaptchaWidget captcha={captcha} />
		</Form>
	);
};

export default AcceptInvitationForm;
