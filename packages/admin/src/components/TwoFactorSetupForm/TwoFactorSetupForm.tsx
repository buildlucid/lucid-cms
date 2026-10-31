import { type Component, createMemo, createSignal, onMount } from "solid-js";
import { Form } from "@/components/Form/Form";
import { InsetLabelInput } from "@/components/InsetLabelInput/InsetLabelInput";
import TwoFactorSetupPanel from "@/components/TwoFactorSetupPanel/TwoFactorSetupPanel";
import constants from "@/constants";
import api from "@/services/api";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";

interface TwoFactorSetupFormProps {
	/** Called with the new recovery codes once the app is confirmed and the user is logged in. */
	onConfirmed: (_recoveryCodes: string[]) => void;
	/** Called when the step has timed out, so the login has to start again. */
	onExpired: () => void;
}

const TwoFactorSetupForm: Component<TwoFactorSetupFormProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [code, setCode] = createSignal("");

	// ----------------------------------------
	// Mutations
	const setup = api.auth.useSetupTwoFactorChallenge({
		onError: (errors) => {
			if (errors?.code === "two_factor_expired") props.onExpired();
		},
	});
	const confirm = api.auth.useConfirmTwoFactorChallenge({
		onSuccess: (res) => props.onConfirmed(res.data.recoveryCodes),
		onError: (errors) => {
			setCode("");
			if (errors?.code === "two_factor_expired") props.onExpired();
		},
	});

	// ----------------------------------------
	// Memos
	const digits = createMemo(() => code().replace(/\D/g, ""));

	// ----------------------------------------
	// Functions
	const submit = (value: string) => {
		const cleaned = value.replace(/\D/g, "");
		if (cleaned.length !== constants.twoFactor.codeLength) return;
		if (confirm.action.isPending || !setup.action.data) return;
		confirm.action.mutate({ code: cleaned });
	};

	// ----------------------------------------
	// Effects
	onMount(() => setup.action.mutate({}));

	// ----------------------------------------
	// Render
	return (
		<Form
			state={{
				isLoading: confirm.action.isPending,
				isDisabled:
					digits().length !== constants.twoFactor.codeLength ||
					!setup.action.data,
				errors: confirm.errors(),
			}}
			content={{
				submit: T()("auth.two.factor.setup.submit"),
			}}
			options={{
				buttonFullWidth: true,
				buttonSize: "lg",
				submitSpacing: "lg",
				disableErrorMessage: true,
			}}
			onSubmit={() => submit(code())}
		>
			<TwoFactorSetupPanel
				setup={setup.action.data?.data}
				failed={setup.action.isError}
				onRetry={() => setup.action.mutate({})}
			/>
			<InsetLabelInput
				id="code"
				name="code"
				type="text"
				value={code()}
				onChange={(value) => {
					setCode(value);
					submit(value);
				}}
				copy={{
					label: T()("auth.two.factor.code.label"),
				}}
				inputMode="numeric"
				autoComplete="one-time-code"
				required={true}
				disabled={!setup.action.data}
				errors={getBodyError("code", confirm.errors)}
			/>
		</Form>
	);
};

export default TwoFactorSetupForm;
