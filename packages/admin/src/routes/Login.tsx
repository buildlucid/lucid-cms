import notifyIllustration from "@assets/illustrations/notify.svg";
import LogoIcon from "@assets/svgs/logo-icon.svg";
import { useNavigate } from "@solidjs/router";
import {
	type Component,
	createEffect,
	createMemo,
	For,
	Match,
	Show,
	Switch,
} from "solid-js";
import LoginForm from "@/components/Forms/Auth/LoginForm";
import ErrorBlock from "@/components/Partials/ErrorBlock";
import FullPageLoading from "@/components/Partials/FullPageLoading";
import api from "@/services/api";
import T from "@/translations";

const LoginRoute: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const navigate = useNavigate();

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
	// Render
	return (
		<Switch>
			<Match when={isLoading()}>
				<FullPageLoading />
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
						<h2 class="mb-3 text-center">Sign in with a provider</h2>
						<div class="flex flex-col gap-2 items-center">
							<For each={providers.data?.data.providers ?? []}>
								{(p) => (
									<button
										type="button"
										class="px-4 py-2 border rounded"
										onClick={() =>
											initiateProvider.action.mutate({
												providerKey: p.key,
												body: {
													actionType: "login",
												},
											})
										}
										disabled={initiateProvider.action.isPending}
									>
										Continue with {p.name}
									</button>
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
