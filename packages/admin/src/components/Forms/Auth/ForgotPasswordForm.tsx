import { A } from "@solidjs/router";
import { type Component, createSignal, Show } from "solid-js";
import { Form, InputFull } from "@/components/Groups/Form";
import api from "@/services/api";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";

interface ForgotPasswordFormProps {
	showBackToLogin?: boolean;
}

const ForgotPasswordForm: Component<ForgotPasswordFormProps> = (props) => {
	// ----------------------------------------
	// State
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
		<Form
			state={{
				isLoading: forgotPassword.action.isPending,
				errors: forgotPassword.errors(),
			}}
			content={{
				submit: T()("send_password_reset"),
			}}
			options={{
				buttonFullWidth: true,
				buttonSize: "large",
				disableErrorMessage: true,
			}}
			onSubmit={() => {
				forgotPassword.action.mutate({ email: email() });
			}}
		>
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
				autoFoucs={true}
				errors={getBodyError("email", forgotPassword.errors)}
			/>
			<Show when={props.showBackToLogin}>
				<A
					class="block text-sm mt-1 hover:text-primary-hover duration-200 transition-colors"
					type="button"
					href="/admin/login"
				>
					{T()("back_to_login")}
				</A>
			</Show>
		</Form>
	);
};

export default ForgotPasswordForm;
