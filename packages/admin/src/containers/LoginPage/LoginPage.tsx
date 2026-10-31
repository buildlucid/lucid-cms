import { useNavigate } from "@solidjs/router";
import { TbOutlineAlertTriangle, TbOutlineMail } from "solid-icons/tb";
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
import AuthSkeleton from "@/components/AuthSkeleton/AuthSkeleton";
import ErrorState from "@/components/ErrorState/ErrorState";
import Link from "@/components/Link/Link";
import LoginForm from "@/components/LoginForm/LoginForm";
import MagicLinkRequestForm from "@/components/MagicLinkRequestForm/MagicLinkRequestForm";
import ProviderButton from "@/components/ProviderButton/ProviderButton";
import ThemeLogoIcon from "@/components/ThemeLogoIcon/ThemeLogoIcon";
import constants from "@/constants";
import type { MagicLinkPageState } from "@/containers/MagicLinkPage/MagicLinkPage";
import { usePageTitle } from "@/hooks/usePageTitle/usePageTitle";
import api from "@/services/api";
import T from "@/translations";
import { getLoginReturnPath } from "@/utils/login-route";
import spawnToast from "@/utils/spawn-toast";

const LoginPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	usePageTitle(() => T()("routes.auth.login.page.title"));
	const navigate = useNavigate();
	const [targetProviderKey, setTargetProviderKey] = createSignal<string | null>(
		null,
	);

	// ----------------------------------------
	// Queries
	const setupRequired = api.auth.useSetupRequired({
		queryParams: {},
	});
	const providers = api.auth.useGetProviders({
		queryParams: {},
	});
	//* pages with captcha forms wait for its settings, so the widget's space is there from the first paint
	const captchaSettings = api.captcha.useGetSettings();
	const initiateProvider = api.auth.useInitiateProvider();

	// ----------------------------------------
	// Memos
	const isLoading = createMemo(
		() =>
			setupRequired.isLoading ||
			providers.isLoading ||
			captchaSettings.isPending,
	);
	const isError = createMemo(() => setupRequired.isError || providers.isError);
	const isSuccess = createMemo(
		() =>
			setupRequired.isSuccess &&
			providers.isSuccess &&
			!setupRequired.data.data.setupRequired,
	);
	const passwordEnabled = createMemo(
		() => providers.data?.data.disablePassword === false,
	);
	const magicLinkEnabled = createMemo(
		() => providers.data?.data.magicLink === true,
	);
	const providerList = createMemo(() => providers.data?.data.providers ?? []);
	//* with a password form, magic links are offered as another way in instead
	const showMagicLinkOption = createMemo(
		() => passwordEnabled() && magicLinkEnabled(),
	);

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (setupRequired.isSuccess && setupRequired.data.data.setupRequired) {
			navigate("/admin/setup");
		}
	});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		const urlParams = new URLSearchParams(location.search);

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
			<Match when={isError()}>
				<ErrorState
					icon={<TbOutlineAlertTriangle />}
					title={T()("errors.generic.title")}
					description={T()("errors.generic.message")}
				/>
			</Match>
			<Match when={isSuccess()}>
				<ThemeLogoIcon class="h-8 mx-auto mb-6" />
				<h1 class="mb-1 text-center">{T()("routes.auth.login.title")}</h1>
				<p class="text-center max-w-sm mx-auto">
					{T()("routes.auth.login.description")}
				</p>
				<div class="my-10">
					<Switch>
						<Match when={passwordEnabled()}>
							<LoginForm showForgotPassword={true} />
						</Match>
						<Match when={magicLinkEnabled()}>
							<MagicLinkRequestForm
								onSent={(email) => {
									navigate(`/admin/magic-link${location.search}`, {
										state: { email } satisfies MagicLinkPageState,
									});
								}}
							/>
						</Match>
					</Switch>
				</div>

				<Show when={showMagicLinkOption() || providerList().length > 0}>
					<div class="my-8">
						<Show when={passwordEnabled() || magicLinkEnabled()}>
							<span class="text-center mx-auto flex items-center justify-center gap-2 my-8">
								<span class="w-20 h-px bg-border" />
								<span class="text-body text-sm mx-2.5">{T()("common.or")}</span>
								<span class="w-20 h-px bg-border" />
							</span>
						</Show>
						<div class="flex flex-col gap-4 items-center">
							<Show when={showMagicLinkOption()}>
								{/* matches ProviderButton's text colour, which is quieter than the outline variant */}
								<Link
									variant="outline"
									size="lg"
									class="w-full text-body! hover:text-secondary-foreground!"
									href={`/admin/magic-link${location.search}`}
								>
									<TbOutlineMail class="size-4 mr-3" />
									{T()("auth.magic.link.option")}
								</Link>
							</Show>
							<For each={providerList()}>
								{(p) => (
									<ProviderButton
										provider={p}
										onClick={() => {
											setTargetProviderKey(p.key);
											initiateProvider.action.mutate({
												providerKey: p.key,
												body: {
													actionType: "login",
													redirectPath: getLoginReturnPath(location.search),
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

export default LoginPage;
