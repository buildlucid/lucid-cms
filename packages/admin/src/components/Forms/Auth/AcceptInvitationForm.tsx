import { type Component, createSignal } from "solid-js";
import { Form, InputFull } from "@/components/Groups/Form";
import api from "@/services/api";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";

interface AcceptInvitationFormProps {
	token: string;
}

const AcceptInvitationForm: Component<AcceptInvitationFormProps> = (props) => {
	// ----------------------------------------
	// State
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
				isLoading: acceptInvitation.action.isPending,
				errors: acceptInvitation.errors(),
			}}
			content={{
				submit: T()("accept_invitation"),
			}}
			options={{
				buttonFullWidth: true,
				buttonSize: "large",
				disableErrorMessage: true,
			}}
			onSubmit={() => {
				acceptInvitation.action.mutate({
					token: props.token,
					body: {
						password: password(),
						passwordConfirmation: passwordConfirmation(),
					},
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
				autoComplete="new-password"
				errors={getBodyError("password", acceptInvitation.errors)}
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
				errors={getBodyError("passwordConfirmation", acceptInvitation.errors)}
			/>
		</Form>
	);
};

export default AcceptInvitationForm;
