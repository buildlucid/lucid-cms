import T, { getLocale, setLocale, localesConfig } from "@/translations";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Show,
} from "solid-js";
import { useLocation, useNavigate } from "@solidjs/router";
import userStore from "@/store/userStore";
import { DynamicContent } from "@/components/Groups/Layout";
import InfoRow from "@/components/Blocks/InfoRow";
import UpdateAccountForm from "@/components/Forms/Account/UpdateAccountForm";
import { Select } from "@/components/Groups/Form";
import AuthProviderRow from "@/components/Partials/AuthProviderRow";
import Spinner from "@/components/Partials/Spinner";
import Alert from "@/components/Blocks/Alert";
import Button from "@/components/Partials/Button";
import api from "@/services/api";
import spawnToast from "@/utils/spawn-toast";
import constants from "@/constants";
import type { SupportedLocales, UserResponse } from "@types";
import UpdatePasswordModal from "@/components/Modals/User/UpdatePassword";

export const Account: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const location = useLocation();
	const navigate = useNavigate();
	const [linkingProviderKey, setLinkingProviderKey] = createSignal<string>();
	const [unlinkingProviderKey, setUnlinkingProviderKey] =
		createSignal<string>();
	const [passwordModalOpen, setPasswordModalOpen] = createSignal(false);

	// ----------------------------------------
	// Memos
	const user = createMemo(() => userStore.get.user);

	// ----------------------------------------
	// Queries
	const providers = api.auth.useGetProviders({
		queryParams: {},
	});

	// ----------------------------------------
	// Mutations
	const initiateProvider = api.auth.useInitiateProvider();
	const unlinkAuthProvider = api.account.useUnlinkAuthProvider({
		onMutate: (params) => {
			setUnlinkingProviderKey(params.providerKey);
		},
		onSuccess: () => {
			setUnlinkingProviderKey(undefined);
		},
		onError: () => {
			setUnlinkingProviderKey(undefined);
		},
	});

	// ----------------------------------------
	// Derived state
	const providersList = createMemo(() => providers.data?.data.providers ?? []);
	const linkedProvidersByKey = createMemo(() => {
		const authProviders = user()?.authProviders ?? [];
		return authProviders.reduce<
			Record<string, NonNullable<UserResponse["authProviders"]>[number]>
		>((map, provider) => {
			if (provider) {
				map[provider.providerKey] = provider;
			}
			return map;
		}, {});
	});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!initiateProvider.action.isPending) {
			setLinkingProviderKey(undefined);
		}
	});

	createEffect(() => {
		const search = location.search;
		if (!search) {
			return;
		}

		const urlParams = new URLSearchParams(search);
		const errorName = urlParams.get(constants.errorQueryParams.errorName);
		const errorMessage = urlParams.get(constants.errorQueryParams.errorMessage);
		const hasError = errorName !== null || errorMessage !== null;

		if (!hasError) {
			return;
		}

		const title = errorName ?? T()("error_title");
		const message = errorMessage ?? T()("error_message");

		spawnToast({
			title,
			message,
			status: "error",
		});

		urlParams.delete(constants.errorQueryParams.errorName);
		urlParams.delete(constants.errorQueryParams.errorMessage);

		navigate(
			`${location.pathname}${
				urlParams.size > 0 ? `?${urlParams.toString()}` : ""
			}`,
		);
	});

	// ----------------------------------------
	// Render
	return (
		<DynamicContent
			options={{
				padding: "24",
			}}
		>
			{/* Account Details */}
			<InfoRow.Root
				title={T()("account_details")}
				description={T()("account_details_description")}
			>
				<InfoRow.Content>
					<UpdateAccountForm
						firstName={user()?.firstName ?? undefined}
						lastName={user()?.lastName ?? undefined}
						username={user()?.username ?? undefined}
						email={user()?.email ?? undefined}
					/>
				</InfoRow.Content>
			</InfoRow.Root>
			{/* Security */}
			<Show
				when={
					providers.data?.data.disablePassword === false ||
					(providers.data?.data.providers?.length ?? 0) > 0
				}
			>
				<InfoRow.Root
					title={T()("security")}
					description={T()("account_security_description")}
				>
					<Show when={providers.data?.data.disablePassword === false}>
						<InfoRow.Content
							title={T()("password")}
							description={T()("account_password_description")}
							actions={
								<Button
									theme="border-outline"
									size="small"
									type="button"
									onClick={() => setPasswordModalOpen(true)}
								>
									{T()("reset_password")}
								</Button>
							}
							actionAlignment="center"
						/>
					</Show>
					<Show when={providersList().length > 0}>
						<InfoRow.Content
							title={T()("auth_providers")}
							description={T()("account_auth_providers_description")}
						>
							<div class="flex flex-col gap-3">
								<For each={providersList()}>
									{(provider) => {
										const linkedProvider = linkedProvidersByKey()[provider.key];
										const isLinking =
											linkingProviderKey() === provider.key &&
											initiateProvider.action.isPending;

										const isUnlinking =
											unlinkingProviderKey() === provider.key &&
											unlinkAuthProvider.action.isPending;

										return (
											<AuthProviderRow
												provider={provider}
												linkedProvider={linkedProvider}
												onUnlink={
													linkedProvider
														? () => {
																if (unlinkAuthProvider.action.isPending) return;
																unlinkAuthProvider.action.mutate({
																	providerKey: provider.key,
																});
															}
														: undefined
												}
												onLink={
													!linkedProvider
														? () => {
																if (initiateProvider.action.isPending) {
																	return;
																}
																setLinkingProviderKey(provider.key);
																initiateProvider.action.mutate({
																	providerKey: provider.key,
																	body: {
																		actionType: "authenticated-link",
																		redirectPath: `${location.pathname}${
																			location.search
																		}${location.hash}`,
																	},
																});
															}
														: undefined
												}
												isLoading={isLinking || isUnlinking}
											/>
										);
									}}
								</For>
							</div>
						</InfoRow.Content>
					</Show>
				</InfoRow.Root>
			</Show>
			{/* Configuration */}
			<InfoRow.Root
				title={T()("account_preferences")}
				description={T()("account_preferences_description")}
			>
				<InfoRow.Content
					title={T()("cms_locale")}
					description={T()("cms_locale_description")}
				>
					<Select
						id={"cms-locale"}
						value={getLocale()}
						options={localesConfig.map((locale) => ({
							label: locale.name || locale.code,
							value: locale.code,
						}))}
						onChange={(value) => {
							setLocale(value as SupportedLocales);
						}}
						name={"cms-locale"}
						noClear={true}
					/>
				</InfoRow.Content>
			</InfoRow.Root>

			{/* Modals */}
			<Show when={providers.data?.data.disablePassword === false}>
				<UpdatePasswordModal
					state={{
						open: passwordModalOpen(),
						setOpen: setPasswordModalOpen,
					}}
				/>
			</Show>
		</DynamicContent>
	);
};
