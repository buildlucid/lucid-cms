import { A, useLocation } from "@solidjs/router";
import { type Component, createSignal, Show } from "solid-js";
import CaptchaWidget from "@/components/CaptchaWidget/CaptchaWidget";
import { Form } from "@/components/Form/Form";
import { InsetLabelInput } from "@/components/InsetLabelInput/InsetLabelInput";
import { useCaptcha } from "@/hooks/useCaptcha/useCaptcha";
import api from "@/services/api";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";
import { getLoginReturnPath } from "@/utils/login-route";

interface MagicLinkRequestFormProps {
	/** Runs with the email address once the login code has been requested. */
	onSent: (_email: string) => void;
	showBackToLogin?: boolean;
}

const MagicLinkRequestForm: Component<MagicLinkRequestFormProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const location = useLocation();
	const captcha = useCaptcha("magicLink");
	const [email, setEmail] = createSignal("");

	// ----------------------------------------
	// Mutations
	const sendMagicLink = api.auth.useSendMagicLink({
		onSuccess: (params) => {
			props.onSent(params.email);
		},
	});

	// ----------------------------------------
	// Render
	return (
		<>
			<Form
				state={{
					isLoading: sendMagicLink.action.isPending || captcha.isPending(),
					errors: sendMagicLink.errors(),
				}}
				content={{
					submit: T()("auth.magic.link.send.action"),
				}}
				options={{
					buttonFullWidth: true,
					buttonSize: "lg",
					submitSpacing: "lg",
					disableErrorMessage: true,
				}}
				onSubmit={() => {
					void captcha.submit((captchaToken) =>
						sendMagicLink.action.mutateAsync({
							email: email(),
							redirectPath: getLoginReturnPath(location.search),
							captchaToken,
						}),
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
					autoComplete="email"
					errors={getBodyError("email", sendMagicLink.errors)}
				/>
				<CaptchaWidget captcha={captcha} />
			</Form>
			<Show when={props.showBackToLogin}>
				<A
					class="block mt-6 text-center text-sm hover:text-primary-hover duration-200 transition-colors"
					href={`/admin/login${location.search}`}
				>
					{T()("common.back.to.login")}
				</A>
			</Show>
		</>
	);
};

export default MagicLinkRequestForm;
