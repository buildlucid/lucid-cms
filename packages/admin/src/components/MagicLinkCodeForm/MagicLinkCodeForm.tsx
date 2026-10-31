import { A, useLocation } from "@solidjs/router";
import {
	type Component,
	createMemo,
	createSignal,
	onCleanup,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import CaptchaWidget from "@/components/CaptchaWidget/CaptchaWidget";
import { Form } from "@/components/Form/Form";
import { InsetLabelInput } from "@/components/InsetLabelInput/InsetLabelInput";
import constants from "@/constants";
import { useCaptcha } from "@/hooks/useCaptcha/useCaptcha";
import api from "@/services/api";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";
import { getLoginReturnPath } from "@/utils/login-route";
import spawnToast from "@/utils/spawn-toast";

interface MagicLinkCodeFormProps {
	/** The address the magic link was sent to. */
	email: string;
}

const resendCooldownMs = constants.magicLink.resendCooldownSeconds * 1000;

const MagicLinkCodeForm: Component<MagicLinkCodeFormProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const location = useLocation();
	const captcha = useCaptcha("magicLink");
	const [showCodeInput, setShowCodeInput] = createSignal(false);
	const [code, setCode] = createSignal("");
	const [now, setNow] = createSignal(Date.now());
	const [resendAt, setResendAt] = createSignal(Date.now() + resendCooldownMs);

	//* a deadline rather than a counter, as timers slow down in background tabs
	const timer = setInterval(() => setNow(Date.now()), 1000);
	onCleanup(() => clearInterval(timer));

	// ----------------------------------------
	// Mutations
	const login = api.auth.useMagicLinkLogin({
		onError: () => {
			setCode("");
		},
	});
	const sendMagicLink = api.auth.useSendMagicLink({
		onSuccess: () => {
			setCode("");
			login.reset();
			const sentAt = Date.now();
			setNow(sentAt);
			setResendAt(sentAt + resendCooldownMs);
			spawnToast({
				title: T()("toasts.common.magic.link.resent.title"),
				message: T()("toasts.common.magic.link.resent.message"),
				status: "success",
			});
		},
	});

	// ----------------------------------------
	// Memos
	const digits = createMemo(() => code().replace(/\D/g, ""));
	const resendSeconds = createMemo(() =>
		Math.max(0, Math.ceil((resendAt() - now()) / 1000)),
	);

	// ----------------------------------------
	// Functions
	const submit = (value: string) => {
		const cleaned = value.replace(/\D/g, "");
		if (cleaned.length !== constants.magicLink.codeLength) return;
		if (login.action.isPending) return;
		login.action.mutate({ email: props.email, code: cleaned });
	};
	const resend = () => {
		void captcha.submit((captchaToken) =>
			sendMagicLink.action.mutateAsync({
				email: props.email,
				redirectPath: getLoginReturnPath(location.search),
				captchaToken,
			}),
		);
	};

	// ----------------------------------------
	// Render
	return (
		<>
			<Show
				when={showCodeInput()}
				fallback={
					<Button
						type="button"
						variant="outline"
						size="lg"
						class="w-full"
						onClick={() => setShowCodeInput(true)}
					>
						{T()("auth.magic.link.code.manual")}
					</Button>
				}
			>
				<Form
					state={{
						isLoading: login.action.isPending,
						isDisabled: digits().length !== constants.magicLink.codeLength,
						errors: login.errors(),
					}}
					content={{
						submit: T()("auth.magic.link.code.submit"),
					}}
					options={{
						buttonFullWidth: true,
						buttonSize: "lg",
						submitSpacing: "lg",
						disableErrorMessage: true,
					}}
					onSubmit={() => submit(code())}
				>
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
							label: T()("auth.magic.link.code.label"),
						}}
						inputMode="numeric"
						autoComplete="one-time-code"
						autofocus={true}
						required={true}
						errors={getBodyError("code", login.errors)}
					/>
				</Form>
			</Show>
			<div class="mt-6 flex flex-col items-center gap-2">
				<p class="text-center text-sm">
					{T()("auth.magic.link.resend.prompt")}{" "}
					<Show
						when={resendSeconds() === 0}
						fallback={
							<span class="text-muted tabular-nums">
								{T()("auth.magic.link.resend.countdown", {
									seconds: resendSeconds(),
								})}
							</span>
						}
					>
						<button
							type="button"
							class="font-medium text-subtitle hover:text-primary-hover duration-200 transition-colors disabled:cursor-not-allowed disabled:opacity-80"
							onClick={resend}
							disabled={sendMagicLink.action.isPending || captcha.isPending()}
						>
							{T()("auth.magic.link.resend.action")}
						</button>
					</Show>
				</p>
				<A
					class="text-sm hover:text-primary-hover duration-200 transition-colors"
					href={`/admin/login${location.search}`}
				>
					{T()("common.back.to.login")}
				</A>
			</div>
			{/* only needed for resending, so it waits until that's possible */}
			<Show when={resendSeconds() === 0}>
				<div class="mt-4">
					<CaptchaWidget captcha={captcha} />
				</div>
			</Show>
		</>
	);
};

export default MagicLinkCodeForm;
