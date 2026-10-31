import { useLocation, useNavigate } from "@solidjs/router";
import { TbOutlineMailX } from "solid-icons/tb";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Match,
	Show,
	Switch,
} from "solid-js";
import AcceptInvitationForm from "@/components/AcceptInvitationForm/AcceptInvitationForm";
import AuthSkeleton from "@/components/AuthSkeleton/AuthSkeleton";
import ErrorState from "@/components/ErrorState/ErrorState";
import Link from "@/components/Link/Link";
import ProviderButton from "@/components/ProviderButton/ProviderButton";
import ThemeLogoIcon from "@/components/ThemeLogoIcon/ThemeLogoIcon";
import constants from "@/constants";
import { usePageTitle } from "@/hooks/usePageTitle/usePageTitle";
import api from "@/services/api";
import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";

const AcceptInvitationPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	usePageTitle(() => T()("routes.auth.accept.invitation.title"));
	const location = useLocation();
	const navigate = useNavigate();
	const [targetProviderKey, setTargetProviderKey] = createSignal<string | null>(
		null,
	);

	// ---------------------------------------
	// Memos
	const token = createMemo(() => {
		const urlParams = new URLSearchParams(location.search);
		return urlParams.get("token");
	});

	// ----------------------------------------
	// Queries / Mutations
	const validateInvitation = api.auth.useValidateInvitation({
		queryParams: {
			location: {
				token: token() as string,
			},
		},
		enabled: () => token() !== null,
	});
	const providers = api.auth.useGetProviders({
		queryParams: {},
		enabled: () => token() !== null,
	});
	//* pages with captcha forms wait for its settings, so the widget's space is there from the first paint
	const captchaSettings = api.captcha.useGetSettings();
	const initiateProvider = api.auth.useInitiateProvider();

	// ---------------------------------------
	// Derived state
	const isLoading = createMemo(
		() =>
			validateInvitation.isLoading ||
			providers.isLoading ||
			captchaSettings.isPending,
	);
	const isInvalid = createMemo(
		() =>
			validateInvitation.isError ||
			(validateInvitation.isSuccess &&
				validateInvitation.data?.data.valid === false),
	);
	const isReady = createMemo(
		() => validateInvitation.isSuccess && providers.isSuccess,
	);
	const passwordEnabled = createMemo(
		() => providers.data?.data.disablePassword === false,
	);
	//* without password login, magic link users accept with a single button
	const passwordless = createMemo(
		() => !passwordEnabled() && providers.data?.data.magicLink === true,
	);

	// ----------------------------------------
	// Effects
	createEffect(() => {
		const urlParams = new URLSearchParams(location.search);

		if (!token()) {
			navigate("/admin/login");
		}

		const errorName = urlParams.get(constants.errorQueryParams.errorName);
		const errorMessage = urlParams.get(constants.errorQueryParams.errorMessage);

		if (errorName || errorMessage) {
			spawnToast({
				title: errorName ?? T()("errors.generic.title"),
				message: errorMessage ?? undefined,
				status: "error",
			});
			urlParams.delete(constants.errorQueryParams.errorName);
			urlParams.delete(constants.errorQueryParams.errorMessage);

			navigate(
				`${location.pathname}${urlParams.size > 0 ? `?${urlParams.toString()}` : ""}`,
			);
		}
	});

	createEffect(() => {
		if (
			!initiateProvider.action.isPending &&
			(initiateProvider.action.isSuccess || initiateProvider.action.isError)
		) {
			setTargetProviderKey(null);
		}
	});

	// ----------------------------------------
	// Render
	return (
		<Switch>
			<Match when={isLoading()}>
				<AuthSkeleton fields={2} />
			</Match>
			<Match when={isInvalid()}>
				<ErrorState
					icon={<TbOutlineMailX />}
					title={T()("auth.invitations.token.invalid.title")}
					description={T()("auth.invitations.token.invalid.description")}
					actions={
						<Link variant="primary" size="sm" href="/admin/login">
							{T()("common.back.to.login")}
						</Link>
					}
				/>
			</Match>
			<Match when={isReady()}>
				<ThemeLogoIcon class="h-8 mx-auto mb-6" />
				<h1 class="mb-1 text-center">
					{T()("routes.auth.accept.invitation.title")}
				</h1>
				<p class="text-center max-w-sm mx-auto">
					{passwordless()
						? T()("routes.auth.accept.invitation.passwordless.description")
						: T()("routes.auth.accept.invitation.description")}
				</p>

				<Show when={passwordEnabled() || passwordless()}>
					<div class="my-10">
						<AcceptInvitationForm
							token={token() as string}
							passwordless={passwordless()}
						/>
					</div>
				</Show>

				<Show
					when={
						providers.data?.data.providers?.length &&
						providers.data?.data.providers?.length > 0
					}
				>
					<div class="my-8">
						<Show when={passwordEnabled() || passwordless()}>
							<span class="text-center mx-auto flex items-center justify-center gap-2 my-8">
								<span class="w-20 h-px bg-border" />
								<span class="text-body text-sm mx-2.5">{T()("common.or")}</span>
								<span class="w-20 h-px bg-border" />
							</span>
						</Show>
						<div class="flex flex-col gap-4 items-center">
							<For each={providers.data?.data.providers ?? []}>
								{(p) => (
									<ProviderButton
										provider={p}
										onClick={() => {
											setTargetProviderKey(p.key);
											initiateProvider.action.mutate({
												providerKey: p.key,
												body: {
													invitationToken: token() as string,
													actionType: "invitation",
												},
											});
										}}
										disabled={initiateProvider.action.isPending}
										isLoading={
											initiateProvider.action.isPending &&
											targetProviderKey() === p.key
										}
									/>
								)}
							</For>
						</div>
					</div>
				</Show>
			</Match>
		</Switch>
	);
};

export default AcceptInvitationPage;
