import { useLocation, useNavigate } from "@solidjs/router";
import type { User } from "@types";
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
import CreateUpdateProfilePicturePanel from "@/components/Panels/Media/CreateUpdateProfilePicturePanel";
import AuthProviderRow from "@/components/Partials/AuthProviderRow";
import Button from "@/components/Partials/Button";
import ProfilePicturePreviewCard from "@/components/Partials/ProfilePicturePreviewCard";
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
	const [profilePicturePanelOpen, setProfilePicturePanelOpen] =
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
	const deleteProfilePicture = api.account.useDeleteProfilePicture();

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
			Record<string, NonNullable<User["authProviders"]>[number]>
		>((map, provider) => {
			if (provider) {
				map[provider.providerKey] = provider;
			}
			return map;
		}, {});
	});

	// ----------------------------------------
	// Handlers
	const handleClearProfilePicture = () => {
		deleteProfilePicture.action.mutate({});
	};

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

		const title = errorName ?? T()("errors.generic.title");
		const message = errorMessage ?? T()("errors.generic.message");

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
			{/* Profile Picture */}
			<InfoRow.Root
				title={T()("account.profile.picture.title")}
				description={T()("account.profile.picture.description")}
			>
				<ProfilePicturePreviewCard
					user={{
						username: user()?.username,
						firstName: user()?.firstName,
						lastName: user()?.lastName,
						profilePicture: user()?.profilePicture,
					}}
					onEdit={() => setProfilePicturePanelOpen(true)}
					onClear={
						user()?.profilePicture ? handleClearProfilePicture : undefined
					}
					clearLoading={deleteProfilePicture.action.isPending}
				/>
			</InfoRow.Root>
			{/* Account Details */}
			<InfoRow.Root
				title={T()("account.details.title")}
				description={T()("account.details.description")}
			>
				<InfoRow.Content>
					<UpdateAccountForm
						firstName={user()?.firstName ?? undefined}
						lastName={user()?.lastName ?? undefined}
						username={user()?.username ?? undefined}
						email={user()?.email ?? undefined}
						pendingEmailChange={user()?.pendingEmailChange}
					/>
				</InfoRow.Content>
			</InfoRow.Root>
			{/* Security */}
			<InfoRow.Root
				title={T()("common.security")}
				description={T()("account.security.description")}
			>
				<Show when={passwordAuthEnabled() && userHasPassword()}>
					<InfoRow.Content
						title={T()("common.password")}
						description={T()("account.password.description")}
						reducedMargin={true}
						actions={
							<Button
								theme="border-outline"
								size="small"
								type="button"
								onClick={() => setPasswordModalOpen(true)}
							>
								{T()("actions.reset.password")}
							</Button>
						}
						actionAlignment="center"
					/>
				</Show>
				<Show when={passwordAuthEnabled() && !userHasPassword()}>
					<InfoRow.Content
						title={T()("common.password")}
						description={T()("account.password.set.description")}
						reducedMargin={true}
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
											title: T()("errors.generic.title"),
											message: T()("errors.generic.message"),
											status: "error",
										});
										return;
									}
									forgotPassword.action.mutate({ email });
								}}
							>
								{T()("account.password.reset.send.and.logout")}
							</Button>
						}
						actionAlignment="center"
					/>
				</Show>
				<Show when={providersList().length > 0}>
					<InfoRow.Content
						title={T()("account.auth.providers.title")}
						description={T()("account.auth.providers.description")}
						reducedMargin={true}
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
																			"toasts.common.auth.provider.last.unlink.blocked.title",
																		),
																		message: T()(
																			"toasts.common.auth.provider.last.unlink.password.disabled.message",
																		),
																		status: "error",
																	});
																	return;
																}
																if (!userHasPassword()) {
																	spawnToast({
																		title: T()(
																			"toasts.common.auth.provider.last.unlink.blocked.title",
																		),
																		message: T()(
																			"toasts.common.auth.provider.last.unlink.no.password.message",
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
					title={T()("account.sessions.title")}
					description={T()("account.sessions.description")}
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
							{T()("common.logout.everywhere")}
						</Button>
					}
					actionAlignment="center"
				/>
			</InfoRow.Root>
			{/* Configuration */}
			<InfoRow.Root
				title={T()("account.preferences.title")}
				description={T()("account.preferences.description")}
			>
				<InfoRow.Content
					title={T()("settings.interface.cms.locale.title")}
					description={T()("settings.interface.cms.locale.description")}
				>
					<Select
						id={"cms-locale"}
						value={getLocale()}
						options={localesConfig.map((locale) => ({
							label: locale.name || locale.code,
							value: locale.code,
						}))}
						onChange={(value) => {
							if (typeof value === "string") setLocale(value);
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
					title: T()("modals.account.revoke.sessions.title"),
					description: T()("modals.account.revoke.sessions.description"),
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
			<CreateUpdateProfilePicturePanel
				state={{
					open: profilePicturePanelOpen(),
					setOpen: setProfilePicturePanelOpen,
					media: user()?.profilePicture ?? null,
				}}
			/>
		</DynamicContent>
	);
};
