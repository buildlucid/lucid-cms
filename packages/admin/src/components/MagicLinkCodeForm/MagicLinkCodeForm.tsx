import { A, useLocation } from "@solidjs/router";
import classNames from "classnames";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import CaptchaWidget from "@/components/CaptchaWidget/CaptchaWidget";
import { Form } from "@/components/Form/Form";
import constants from "@/constants";
import { useCaptcha } from "@/hooks/useCaptcha/useCaptcha";
import api from "@/services/api";
import T from "@/translations";
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
	let codeInput: HTMLInputElement | undefined;

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
	//* the error shows as a toast, and the input stays red until the code changes
	const codeError = createMemo(() => login.errors()?.message);
	const resendSeconds = createMemo(() =>
		Math.max(0, Math.ceil((resendAt() - now()) / 1000)),
	);

	// ----------------------------------------
	// Functions
	const submit = (value: string) => {
		if (value.length !== constants.magicLink.codeLength) return;
		if (login.action.isPending) return;
		login.action.mutate({ email: props.email, code: value });
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
	// Effects
	createEffect(() => {
		//* focus when the input opens, and again after a wrong code clears it
		if (showCodeInput() && !login.action.isPending) codeInput?.focus();
	});

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
						isDisabled: code().length !== constants.magicLink.codeLength,
						errors: undefined,
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
					<input
						ref={codeInput}
						id="code"
						name="code"
						class={classNames(
							"h-12 w-full rounded-md border bg-input px-3 text-center font-mono text-lg tracking-[0.4em] text-subtitle caret-primary placeholder:font-sans placeholder:text-base placeholder:tracking-normal placeholder:text-muted transition-colors duration-200 focus:outline-hidden focus:border-primary disabled:cursor-not-allowed disabled:opacity-80",
							{
								"border-border": codeError() === undefined,
								"border-danger": codeError() !== undefined,
							},
						)}
						type="text"
						inputmode="numeric"
						autocomplete="one-time-code"
						placeholder={T()("auth.magic.link.code.placeholder")}
						aria-label={T()("auth.magic.link.code.label")}
						aria-invalid={codeError() !== undefined || undefined}
						value={code()}
						disabled={login.action.isPending}
						onInput={(event) => {
							//* only digits count, so pasted codes with spaces or labels still work
							const value = event.currentTarget.value
								.replace(/\D/g, "")
								.slice(0, constants.magicLink.codeLength);
							event.currentTarget.value = value;
							setCode(value);
							if (codeError()) login.reset();
							submit(value);
						}}
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
