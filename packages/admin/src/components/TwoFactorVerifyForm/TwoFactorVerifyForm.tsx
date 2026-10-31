import { type Component, createMemo, createSignal } from "solid-js";
import { Form } from "@/components/Form/Form";
import TwoFactorProofField, {
	isTwoFactorProofComplete,
	type TwoFactorProofMethod,
	toTwoFactorProof,
} from "@/components/TwoFactorProofField/TwoFactorProofField";
import api from "@/services/api";
import T from "@/translations";

interface TwoFactorVerifyFormProps {
	method: TwoFactorProofMethod;
	onMethodChange: (_method: TwoFactorProofMethod) => void;
	/** Called when the step has timed out or run out of tries, so the login has to start again. */
	onExpired: () => void;
}

/** The code step of a login. App codes send as soon as every digit is in. */
const TwoFactorVerifyForm: Component<TwoFactorVerifyFormProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [value, setValue] = createSignal("");

	// ----------------------------------------
	// Mutations
	const verify = api.auth.useVerifyTwoFactor({
		onError: (errors) => {
			setValue("");
			if (errors?.code === "two_factor_expired") props.onExpired();
		},
	});

	// ----------------------------------------
	// Memos
	const complete = createMemo(() =>
		isTwoFactorProofComplete(props.method, value()),
	);

	// ----------------------------------------
	// Functions
	const submit = (input: string) => {
		if (!isTwoFactorProofComplete(props.method, input)) return;
		if (verify.action.isPending) return;
		verify.action.mutate(toTwoFactorProof(props.method, input));
	};

	// ----------------------------------------
	// Render
	return (
		<Form
			state={{
				isLoading: verify.action.isPending,
				isDisabled: !complete(),
				errors: verify.errors(),
			}}
			content={{
				submit: T()("auth.two.factor.verify.submit"),
			}}
			options={{
				buttonFullWidth: true,
				buttonSize: "lg",
				submitSpacing: "lg",
				disableErrorMessage: true,
			}}
			onSubmit={() => submit(value())}
		>
			<TwoFactorProofField
				theme="inset"
				method={props.method}
				onMethodChange={(method) => {
					verify.reset();
					props.onMethodChange(method);
				}}
				value={value()}
				onChange={(input) => {
					setValue(input);
					if (props.method === "code") submit(input);
				}}
				errors={verify.errors}
				autofocus={true}
				disabled={verify.action.isPending}
			/>
		</Form>
	);
};

export default TwoFactorVerifyForm;
