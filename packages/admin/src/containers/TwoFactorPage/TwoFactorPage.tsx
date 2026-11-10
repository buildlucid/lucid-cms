import { browserSupportsWebAuthn } from "@simplewebauthn/browser";
import { A, useLocation, useNavigate } from "@solidjs/router";
import { useQueryClient } from "@tanstack/solid-query";
import { TbOutlineLockAccess } from "solid-icons/tb";
import {
	type Component,
	createMemo,
	createSignal,
	Match,
	Show,
	Switch,
} from "solid-js";
import AuthSkeleton from "@/components/AuthSkeleton/AuthSkeleton";
import ConfirmActionButton from "@/components/ConfirmActionButton/ConfirmActionButton";
import ErrorState from "@/components/ErrorState/ErrorState";
import Link from "@/components/Link/Link";
import OrDivider from "@/components/OrDivider/OrDivider";
import PasskeyButton from "@/components/PasskeyButton/PasskeyButton";
import RecoveryCodesList from "@/components/RecoveryCodesList/RecoveryCodesList";
import ThemeLogoIcon from "@/components/ThemeLogoIcon/ThemeLogoIcon";
import type { TwoFactorProofMethod } from "@/components/TwoFactorProofField/TwoFactorProofField";
import TwoFactorSetupForm from "@/components/TwoFactorSetupForm/TwoFactorSetupForm";
import TwoFactorVerifyForm from "@/components/TwoFactorVerifyForm/TwoFactorVerifyForm";
import { usePageTitle } from "@/hooks/usePageTitle/usePageTitle";
import api from "@/services/api";
import T from "@/translations";
import { getPostLoginPath } from "@/utils/passkeys";
import spawnToast from "@/utils/spawn-toast";

/** Lives outside logged-out routes so recovery codes remain visible after setup starts the session. */
const TwoFactorPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const location = useLocation();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [method, setMethod] = createSignal<TwoFactorProofMethod>("code");
	const [recoveryCodes, setRecoveryCodes] = createSignal<string[]>();
	const [expired, setExpired] = createSignal(false);

	// ----------------------------------------
	// Queries
	const challenge = api.auth.useGetTwoFactorChallenge({
		queryParams: {},
		//* finishing setup uses up the challenge, but the recovery codes still need showing
		enabled: () => recoveryCodes() === undefined,
	});

	// ----------------------------------------
	// Mutations
	const verifyPasskey = api.auth.useVerifyTwoFactorPasskey({
		onError: (errors) => {
			if (errors?.code === "two_factor_expired") setExpired(true);
		},
	});
	const confirmPasskey = api.auth.useConfirmTwoFactorPasskey({
		onError: (errors) => {
			if (errors?.code === "two_factor_expired") setExpired(true);
		},
	});

	// ----------------------------------------
	// Memos
	const passkeySupported = browserSupportsWebAuthn();
	const methods = createMemo(() => challenge.data?.data.methods);
	const passkeyAlternative = createMemo(
		() =>
			passkeySupported &&
			methods()?.passkey === true &&
			(challenge.data?.data.step === "setup" || methods()?.app === true),
	);
	const description = createMemo(() => {
		if (challenge.data?.data.step === "setup") {
			return passkeyAlternative()
				? T()("routes.auth.two.factor.setup.passkey.description")
				: T()("routes.auth.two.factor.setup.description");
		}
		if (methods()?.app !== true) {
			return T()("routes.auth.two.factor.passkey.description");
		}
		if (method() === "recoveryCode") {
			return T()("routes.auth.two.factor.recovery.code.description");
		}
		return passkeyAlternative()
			? T()("routes.auth.two.factor.app.or.passkey.description")
			: T()("routes.auth.two.factor.description");
	});
	const settingUp = createMemo(
		() =>
			challenge.data?.data.step === "setup" || recoveryCodes() !== undefined,
	);
	const loginSearch = createMemo(() => {
		const redirect = new URLSearchParams(location.search).get("redirect");
		return redirect ? `?${new URLSearchParams({ redirect }).toString()}` : "";
	});
	usePageTitle(() =>
		settingUp()
			? T()("routes.auth.two.factor.setup.title")
			: T()("routes.auth.two.factor.title"),
	);

	// ----------------------------------------
	// Functions
	const finish = () => {
		queryClient.clear();
		spawnToast({
			title: T()("toasts.common.login.success.title"),
			message: T()("toasts.common.login.success.message"),
			status: "success",
		});
		navigate(getPostLoginPath(location.search));
	};

	// ----------------------------------------
	// Render
	return (
		<div class="mx-auto w-full max-w-130">
			<Switch>
				<Match when={recoveryCodes()}>
					{(codes) => (
						<>
							<ThemeLogoIcon class="h-8 mx-auto mb-6" />
							<h1 class="mb-1 text-center">
								{T()("routes.auth.two.factor.recovery.title")}
							</h1>
							<p class="text-center max-w-sm mx-auto">
								{T()("routes.auth.two.factor.recovery.description")}
							</p>
							<div class="my-10">
								<RecoveryCodesList codes={codes()} />
								<ConfirmActionButton
									size="lg"
									class="mt-8 w-full"
									onConfirm={finish}
									confirmationText={T()(
										"auth.two.factor.recovery.codes.saved.confirm",
									)}
								>
									{T()("auth.two.factor.recovery.codes.saved")}
								</ConfirmActionButton>
							</div>
						</>
					)}
				</Match>
				<Match when={challenge.isLoading}>
					<AuthSkeleton />
				</Match>
				<Match when={challenge.isError || expired()}>
					<ErrorState
						icon={<TbOutlineLockAccess />}
						title={T()("auth.two.factor.expired.title")}
						description={T()("auth.two.factor.expired.description")}
						actions={
							<Link
								variant="primary"
								size="sm"
								href={`/admin/login${loginSearch()}`}
							>
								{T()("common.back.to.login")}
							</Link>
						}
					/>
				</Match>
				<Match when={challenge.data?.data}>
					{(data) => (
						<>
							<ThemeLogoIcon class="h-8 mx-auto mb-6" />
							<h1 class="mb-1 text-center">
								{data().step === "verify"
									? T()("routes.auth.two.factor.title")
									: T()("routes.auth.two.factor.setup.title")}
							</h1>
							<p class="text-center max-w-sm mx-auto">{description()}</p>
							<div class="my-10">
								<Switch>
									<Match when={data().step === "setup"}>
										<TwoFactorSetupForm
											onConfirmed={setRecoveryCodes}
											onExpired={() => setExpired(true)}
										/>
									</Match>
									<Match when={data().methods.app}>
										<TwoFactorVerifyForm
											method={method()}
											onMethodChange={setMethod}
											onExpired={() => setExpired(true)}
										/>
									</Match>
									<Match when={data().methods.passkey}>
										<PasskeyButton
											variant="primary"
											label={T()("auth.passkey.option")}
											loading={verifyPasskey.action.isPending}
											onClick={() => verifyPasskey.action.mutate()}
										/>
									</Match>
								</Switch>
								<Show when={passkeyAlternative()}>
									<OrDivider class="my-8" />
									<PasskeyButton
										label={
											data().step === "setup"
												? T()("auth.passkey.add.instead.option")
												: T()("auth.passkey.option")
										}
										loading={
											verifyPasskey.action.isPending ||
											confirmPasskey.action.isPending
										}
										onClick={() => {
											if (data().step === "setup") {
												confirmPasskey.action.mutate();
											} else {
												verifyPasskey.action.mutate();
											}
										}}
									/>
								</Show>
								<A
									class="block mt-6 text-center text-sm hover:text-primary-hover transition-colors"
									href={`/admin/login${loginSearch()}`}
								>
									{T()("common.back.to.login")}
								</A>
							</div>
						</>
					)}
				</Match>
			</Switch>
		</div>
	);
};

export default TwoFactorPage;
