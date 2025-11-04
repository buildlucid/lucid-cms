import notifyIllustration from "@assets/illustrations/notify.svg";
import LogoIcon from "@assets/svgs/logo-icon.svg";
import { useNavigate } from "@solidjs/router";
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
import LoginForm from "@/components/Forms/Auth/LoginForm";
import ErrorBlock from "@/components/Partials/ErrorBlock";
import ProviderButton from "@/components/Partials/ProviderButton";
import Spinner from "@/components/Partials/Spinner";
import constants from "@/constants";
import api from "@/services/api";
import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";

const LoginRoute: Component = () => {
	// ----------------------------------------
	// State & Hooks
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
	const initiateProvider = api.auth.useInitiateProvider();

	// ----------------------------------------
	// Memos
	const isLoading = createMemo(
		() => setupRequired.isLoading || providers.isLoading,
	);
	const isError = createMemo(() => setupRequired.isError || providers.isError);
	const isSuccess = createMemo(
		() =>
			setupRequired.isSuccess &&
			providers.isSuccess &&
			!setupRequired.data.data.setupRequired,
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
				title: errorName ?? T()("error_title"),
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
				<div class="flex items-center justify-center h-full">
					<Spinner size="sm" />
				</div>
			</Match>
			<Match when={isError()}>
				<ErrorBlock
					content={{
						image: notifyIllustration,
						title: T()("error_title"),
						description: T()("error_message"),
					}}
				/>
			</Match>
			<Match when={isSuccess()}>
				<img src={LogoIcon} alt="Lucid CMS Logo" class="h-10 mx-auto mb-6" />
				<h1 class="mb-1 text-center">{T()("login_route_title")}</h1>
				<p class="text-center max-w-sm mx-auto">
					{T()("login_route_description")}
				</p>
				<div class="my-10">
					<Show when={providers.data?.data.disablePassword === false}>
						<LoginForm showForgotPassword={true} />
					</Show>
				</div>

				<Show
					when={
						providers.data?.data.providers?.length &&
						providers.data?.data.providers?.length > 0
					}
				>
					<div class="my-8">
						<Show when={providers.data?.data.disablePassword === false}>
							<span class="text-center mx-auto flex items-center justify-center gap-2 my-8">
								<span class="w-20 h-px bg-border" />
								<span class="text-body text-sm mx-2.5">{T()("or")}</span>
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
													actionType: "login",
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

export default LoginRoute;
