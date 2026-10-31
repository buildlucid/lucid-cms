import { A } from "@solidjs/router";
import { type Component, createSignal, Show } from "solid-js";
import CaptchaWidget from "@/components/CaptchaWidget/CaptchaWidget";
import { Form } from "@/components/Form/Form";
import { InsetLabelInput } from "@/components/InsetLabelInput/InsetLabelInput";
import { useCaptcha } from "@/hooks/useCaptcha/useCaptcha";
import api from "@/services/api";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";

interface ForgotPasswordFormProps {
	showBackToLogin?: boolean;
}

const ForgotPasswordForm: Component<ForgotPasswordFormProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const captcha = useCaptcha("requestPasswordReset");
	const [email, setEmail] = createSignal("");

	// ----------------------------------------
	// Mutations
	const forgotPassword = api.account.useForgotPassword({
		onSuccess: () => {
			setEmail("");
		},
	});

	// ----------------------------------------
	// Render
	return (
		<>
			<Form
				state={{
					isLoading: forgotPassword.action.isPending || captcha.isPending(),
					errors: forgotPassword.errors(),
				}}
				content={{
					submit: T()("users.password.reset.send.action"),
				}}
				options={{
					buttonFullWidth: true,
					buttonSize: "lg",
					submitSpacing: "lg",
					disableErrorMessage: true,
				}}
				onSubmit={() => {
					void captcha.submit((captchaToken) =>
						forgotPassword.action.mutateAsync({ email: email(), captchaToken }),
					);
				}}
			>
				<InsetLabelInput
					id="email"
					name="email"
					type="email"
					value={email()}
					onChange={setEmail}
					copy={{
						label: T()("common.email"),
					}}
					required={true}
					autofocus={true}
					errors={getBodyError("email", forgotPassword.errors)}
				/>
				<CaptchaWidget captcha={captcha} />
			</Form>
			<Show when={props.showBackToLogin}>
				<A
					class="block mt-6 text-center text-sm hover:text-primary-hover duration-200 transition-colors"
					href="/admin/login"
				>
					{T()("common.back.to.login")}
				</A>
			</Show>
		</>
	);
};

export default ForgotPasswordForm;
