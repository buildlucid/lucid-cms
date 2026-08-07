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
import { OAuthConnectionsList } from "@/components/Groups/Content/OAuthConnectionsList";
import { UserIntegrationsList } from "@/components/Groups/Content/UserIntegrationsList";
import { Select } from "@/components/Groups/Form";
import { DynamicContent } from "@/components/Groups/Layout";
import { Confirmation } from "@/components/Groups/Modal";
import UpdateAccountDetails from "@/components/Modals/Account/UpdateAccountDetails";
import UpdatePasswordModal from "@/components/Modals/User/UpdatePassword";
import CreateUpdateProfilePicturePanel from "@/components/Panels/Media/CreateUpdateProfilePicturePanel";
import AuthProviderRow from "@/components/Partials/AuthProviderRow";
import Button from "@/components/Partials/Button";
import DetailsList from "@/components/Partials/DetailsList";
import PendingEmailChangeNotice from "@/components/Partials/PendingEmailChangeNotice";
import ProfilePicturePreviewCard from "@/components/Partials/ProfilePicturePreviewCard";
import constants from "@/constants";
import api from "@/services/api";
import userStore from "@/store/userStore";
import T, { getLocale, localesConfig, setLocale } from "@/translations";
import spawnToast from "@/utils/spawn-toast";
import { AppearancePreference } from "./AppearancePreference";

export const Account: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const location = useLocation();
	const navigate = useNavigate();
	const [linkingProviderKey, setLinkingProviderKey] = createSignal<string>();
	const [unlinkingProviderKey, setUnlinkingProviderKey] =
		createSignal<string>();
	const [passwordModalOpen, setPasswordModalOpen] = createSignal(false);
	const [accountDetailsModalOpen, setAccountDetailsModalOpen] =
		createSignal(false);
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
	const cancelEmailChange = api.account.useCancelEmailChange();
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
			{/* Profile */}
			<InfoRow.Root
				title={T()("account.profile.title")}
				description={T()("account.profile.description")}
			>
				<ProfilePicturePreviewCard
					classes="mb-4"
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
				<InfoRow.Content
					title={T()("account.details.summary.title")}
					actions={
						<Button
							theme="border-outline"
							size="small"
							type="button"
							onClick={() => setAccountDetailsModalOpen(true)}
						>
							{T()("account.details.edit.action")}
						</Button>
					}
					actionAlignment="center"
				>
					<DetailsList
						type="text"
						theme="contained"
						items={[
							{
								label: T()("common.first.name"),
								value: user()?.firstName || T()("common.not.set"),
							},
							{
								label: T()("common.last.name"),
								value: user()?.lastName || T()("common.not.set"),
							},
							{
								label: T()("common.username"),
								value: user()?.username || T()("common.not.set"),
								wrap: true,
							},
							{
								label: T()("common.email"),
								value: user()?.email || T()("common.not.set"),
								wrap: true,
							},
						]}
					/>
					<Show when={user()?.pendingEmailChange}>
						{(pendingEmailChange) => (
							<div class="mt-4">
								<PendingEmailChangeNotice
									email={pendingEmailChange().email}
									isLoading={cancelEmailChange.action.isPending}
									onCancel={() => cancelEmailChange.action.mutate({})}
								/>
							</div>
						)}
					</Show>
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
								theme="danger"
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
								theme="danger"
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
					actions={
						<Button
							theme="danger"
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

			{/* Developer Access */}
			<InfoRow.Root
				title={T()("account.developer.access.title")}
				description={T()("account.developer.access.description")}
			>
				<InfoRow.Content
					title={T()("oauth.connections.manage.title")}
					description={T()("oauth.connections.manage.description")}
					reducedMargin={true}
				>
					<div class="-mx-4 -mb-4 overflow-hidden border-t border-border">
						<OAuthConnectionsList
							owner={{ type: "account" }}
							canUpdate={true}
							canRevoke={true}
							embedded={true}
							contained={false}
						/>
					</div>
				</InfoRow.Content>
				<UserIntegrationsList
					services={api.account.integrations}
					canCreate={true}
					canUpdate={true}
					canDelete={true}
					canRegenerate={true}
					embedded={true}
					contained={false}
					contentRow={{
						title: T()("user.integrations.manage.title"),
						description: T()("user.integrations.manage.description"),
					}}
				/>
			</InfoRow.Root>

			{/* Preferences */}
			<InfoRow.Root
				title={T()("account.preferences.title")}
				description={T()("account.preferences.description")}
			>
				<InfoRow.Content
					title={T()("settings.interface.cms.appearance.title")}
					description={T()("settings.interface.cms.appearance.description")}
					reducedMargin={true}
				>
					<AppearancePreference />
				</InfoRow.Content>
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
			<UpdateAccountDetails
				state={{
					open: accountDetailsModalOpen(),
					setOpen: setAccountDetailsModalOpen,
				}}
				data={{
					firstName: user()?.firstName ?? undefined,
					lastName: user()?.lastName ?? undefined,
					username: user()?.username ?? undefined,
					email: user()?.email ?? undefined,
					pendingEmailChange: user()?.pendingEmailChange,
				}}
				emailChange={{
					isLoading: cancelEmailChange.action.isPending,
					onCancel: () => cancelEmailChange.action.mutate({}),
				}}
			/>
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
