import { useLocation, useNavigate } from "@solidjs/router";
import type { SupportedLocales, UserResponse } from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Show,
} from "solid-js";
import InfoRow from "@/components/Blocks/InfoRow";
import UpdateAccountForm from "@/components/Forms/Account/UpdateAccountForm";
import { Select } from "@/components/Groups/Form";
import { DynamicContent } from "@/components/Groups/Layout";
import { Confirmation } from "@/components/Groups/Modal";
import UpdatePasswordModal from "@/components/Modals/User/UpdatePassword";
import AuthProviderRow from "@/components/Partials/AuthProviderRow";
import Button from "@/components/Partials/Button";
import constants from "@/constants";
import api from "@/services/api";
import userStore from "@/store/userStore";
import T, { getLocale, localesConfig, setLocale } from "@/translations";
import spawnToast from "@/utils/spawn-toast";

export const Account: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const location = useLocation();
	const navigate = useNavigate();
	const [linkingProviderKey, setLinkingProviderKey] = createSignal<string>();
	const [unlinkingProviderKey, setUnlinkingProviderKey] =
		createSignal<string>();
	const [passwordModalOpen, setPasswordModalOpen] = createSignal(false);
	const [revokeSessionsModalOpen, setRevokeSessionsModalOpen] =
		createSignal(false);

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
	const logout = api.auth.useLogout();
	const forgotPassword = api.account.useForgotPassword({
		onSuccess: () => {
			logout.action.mutate({});
		},
	});
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
	const revokeRefreshTokens = api.account.useRevokeRefreshTokens({
		onSuccess: () => {
			setRevokeSessionsModalOpen(false);
		},
	});

	// ----------------------------------------
	// Derived state
	const providersList = createMemo(() => providers.data?.data.providers ?? []);
	const passwordAuthEnabled = createMemo(
		() => providers.data?.data.disablePassword === false,
	);
	const userHasPassword = createMemo(() => user()?.hasPassword === true);
	const linkedProvidersCount = createMemo(
		() => user()?.authProviders?.length ?? 0,
	);
	const setPasswordResetLoading = createMemo(
		() => forgotPassword.action.isPending || logout.action.isPending,
	);
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
			<InfoRow.Root
				title={T()("security")}
				description={T()("account_security_description")}
			>
				<Show when={passwordAuthEnabled() && userHasPassword()}>
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
				<Show when={passwordAuthEnabled() && !userHasPassword()}>
					<InfoRow.Content
						title={T()("password")}
						description={T()("account_set_password_description")}
						actions={
							<Button
								theme="border-outline"
								size="small"
								type="button"
								loading={setPasswordResetLoading()}
								onClick={() => {
									if (setPasswordResetLoading()) return;
									const email = user()?.email;
									if (!email) {
										spawnToast({
											title: T()("error_title"),
											message: T()("error_message"),
											status: "error",
										});
										return;
									}
									forgotPassword.action.mutate({ email });
								}}
							>
								{T()("send_password_reset_and_logout")}
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
															const isLastLinkedProvider =
																linkedProvidersCount() <= 1;
															if (isLastLinkedProvider) {
																if (!passwordAuthEnabled()) {
																	spawnToast({
																		title: T()(
																			"auth_provider_last_unlink_blocked_toast_title",
																		),
																		message: T()(
																			"auth_provider_last_unlink_password_disabled_toast_message",
																		),
																		status: "error",
																	});
																	return;
																}
																if (!userHasPassword()) {
																	spawnToast({
																		title: T()(
																			"auth_provider_last_unlink_blocked_toast_title",
																		),
																		message: T()(
																			"auth_provider_last_unlink_no_password_toast_message",
																		),
																		status: "error",
																	});
																	return;
																}
															}
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
																	redirectPath: `${location.pathname}${location.search}${location.hash}`,
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
				<InfoRow.Content
					title={T()("account_sessions")}
					description={T()("account_sessions_description")}
					theme="danger"
					actions={
						<Button
							theme="danger-outline"
							size="small"
							type="button"
							onClick={() => {
								setRevokeSessionsModalOpen(true);
							}}
						>
							{T()("logout_everywhere")}
						</Button>
					}
					actionAlignment="center"
				/>
			</InfoRow.Root>
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
			<Show when={passwordAuthEnabled() && userHasPassword()}>
				<UpdatePasswordModal
					state={{
						open: passwordModalOpen(),
						setOpen: setPasswordModalOpen,
					}}
				/>
			</Show>
			<Confirmation
				theme="danger"
				state={{
					open: revokeSessionsModalOpen(),
					setOpen: setRevokeSessionsModalOpen,
					isLoading: revokeRefreshTokens.action.isPending,
					isError: revokeRefreshTokens.action.isError,
				}}
				copy={{
					title: T()("account_revoke_sessions_modal_title"),
					description: T()("account_revoke_sessions_modal_description"),
					error: revokeRefreshTokens.errors()?.message,
				}}
				callbacks={{
					onConfirm: () => {
						revokeRefreshTokens.action.mutate({});
					},
					onCancel: () => {
						setRevokeSessionsModalOpen(false);
						revokeRefreshTokens.reset();
					},
				}}
			/>
		</DynamicContent>
	);
};
