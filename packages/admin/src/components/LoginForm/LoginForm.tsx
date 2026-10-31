import { A } from "@solidjs/router";
import { type Component, createSignal, Show } from "solid-js";
import CaptchaWidget from "@/components/CaptchaWidget/CaptchaWidget";
import { Form } from "@/components/Form/Form";
import { InsetLabelInput } from "@/components/InsetLabelInput/InsetLabelInput";
import { useCaptcha } from "@/hooks/useCaptcha/useCaptcha";
import api from "@/services/api";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";

interface LoginFormProps {
	showForgotPassword?: boolean;
}

const LoginForm: Component<LoginFormProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const captcha = useCaptcha("login");
	const [usernameOrEmail, setUsernameOrEmail] = createSignal("");
	const [password, setPassword] = createSignal("");

	// ----------------------------------------
	// Mutations
	const login = api.auth.useLogin();

	// ----------------------------------------
	// Render
	return (
		<Form
			state={{
				isLoading: login.action.isPending || captcha.isPending(),
				errors: login.errors(),
			}}
			content={{
				submit: "Login",
			}}
			options={{
				buttonFullWidth: true,
				buttonSize: "lg",
				disableErrorMessage: true,
			}}
			onSubmit={() => {
				void captcha.submit((captchaToken) =>
					login.action.mutateAsync({
						usernameOrEmail: usernameOrEmail(),
						password: password(),
						captchaToken,
					}),
				);
			}}
		>
			<InsetLabelInput
				id="usernameOrEmail"
				name="usernameOrEmail"
				type="text"
				value={usernameOrEmail()}
				onChange={setUsernameOrEmail}
				copy={{
					label: T()("common.username.or.email"),
				}}
				required={true}
				autoFoucs={true}
				autoComplete="username"
				errors={getBodyError("usernameOrEmail", login.errors)}
			/>
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
				autoComplete="current-password"
				errors={getBodyError("password", login.errors)}
			/>
			<Show when={props.showForgotPassword}>
				<A
					class="block text-sm mt-1 hover:text-primary-hover duration-200 transition-colors"
					type="button"
					href="/admin/forgot-password"
				>
					{T()("auth.forgot.password.action")}
				</A>
			</Show>
			<CaptchaWidget captcha={captcha} />
		</Form>
	);
};

export default LoginForm;
