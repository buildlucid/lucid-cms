import notifyIllustration from "@assets/illustrations/notify.svg";
import LogoIcon from "@assets/svgs/logo-icon.svg";
import { useLocation, useNavigate } from "@solidjs/router";
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
import AcceptInvitationForm from "@/components/Forms/Auth/AcceptInvitationForm";
import ProviderButton from "@/components/Partials/ProviderButton";
import ErrorBlock from "@/components/Partials/ErrorBlock";
import Spinner from "@/components/Partials/Spinner";
import constants from "@/constants";
import api from "@/services/api";
import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";

const AcceptInvitationRoute: Component = () => {
	// ----------------------------------------
	// State & Hooks
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
	const initiateProvider = api.auth.useInitiateProvider();

	// ---------------------------------------
	// Derived state
	const isLoading = createMemo(
		() => validateInvitation.isLoading || providers.isLoading,
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
			<Match when={isInvalid()}>
				<ErrorBlock
					content={{
						image: notifyIllustration,
						title: T()("invalid_invitation_token"),
						description: T()("invalid_invitation_token_description"),
					}}
					link={{
						text: T()("back_to_login"),
						href: "/admin/login",
					}}
				/>
			</Match>
			<Match when={isReady()}>
				<img src={LogoIcon} alt="Lucid CMS Logo" class="h-10 mx-auto mb-6" />
				<h1 class="mb-1 text-center">{T()("accept_invitation_route_title")}</h1>
				<p class="text-center max-w-sm mx-auto">
					{T()("accept_invitation_route_description")}
				</p>

				<Show when={providers.data?.data.disablePassword === false}>
					<div class="my-10">
						<AcceptInvitationForm token={token() as string} />
					</div>
				</Show>

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

export default AcceptInvitationRoute;
