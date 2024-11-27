import T from "@/translations";
import { type Component, createSignal, Show } from "solid-js";
import { A } from "@solidjs/router";
import api from "@/services/api";
import Form from "@/components/Groups/Form";
import { getBodyError } from "@/utils/error-helpers";

interface LoginFormProps {
	showForgotPassword?: boolean;
}

const LoginForm: Component<LoginFormProps> = (props) => {
	// ----------------------------------------
	// State
	const [usernameOrEmail, setUsernameOrEmail] = createSignal("");
	const [password, setPassword] = createSignal("");

	// ----------------------------------------
	// Mutations
	const login = api.auth.useLogin();

	// ----------------------------------------
	// Render
	return (
		<Form.Root
			state={{
				isLoading: login.action.isPending,
				errors: login.errors(),
			}}
			content={{
				submit: "Login",
			}}
			options={{
				buttonFullWidth: true,
			}}
			onSubmit={() => {
				login.action.mutate({
					usernameOrEmail: usernameOrEmail(),
					password: password(),
				});
			}}
		>
			<Form.Input
				id="usernameOrEmail"
				name="usernameOrEmail"
				type="text"
				value={usernameOrEmail()}
				onChange={setUsernameOrEmail}
				copy={{
					label: T()("username_or_email"),
				}}
				required={true}
				autoFoucs={true}
				autoComplete="username"
				errors={getBodyError("usernameOrEmail", login.errors)}
				theme="full"
			/>
			<Form.Input
				id="password"
				name="password"
				type="password"
				value={password()}
				onChange={setPassword}
				copy={{
					label: T()("password"),
				}}
				required={true}
				autoComplete="current-password"
				errors={getBodyError("password", login.errors)}
				theme="full"
			/>
			<Show when={props.showForgotPassword}>
				<A
					class="block text-sm mt-1 hover:text-primary-hover duration-200 transition-colors"
					type="button"
					href="/admin/forgot-password"
				>
					{T()("forgot_password")}
				</A>
			</Show>
		</Form.Root>
	);
};

export default LoginForm;
