import T from "@/translations";
import { type Component, createSignal, Show } from "solid-js";
import { A } from "@solidjs/router";
import { getBodyError } from "@/utils/error-helpers";
import api from "@/services/api";
import Form from "@/components/Groups/Form";

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
		<Form.Root
			state={{
				isLoading: forgotPassword.action.isPending,
				errors: forgotPassword.errors(),
			}}
			content={{
				submit: T()("send_password_reset"),
			}}
			options={{
				buttonFullWidth: true,
			}}
			onSubmit={() => {
				forgotPassword.action.mutate({ email: email() });
			}}
		>
			<Form.Input
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
				theme="full"
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
		</Form.Root>
	);
};

export default ForgotPasswordForm;
