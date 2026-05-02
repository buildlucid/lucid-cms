import type { User } from "@types";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Show,
} from "solid-js";
import { SelectMultiple, Switch } from "@/components/Groups/Form";
import type { SelectMultipleValueT } from "@/components/Groups/Form/SelectMultiple";
import { Panel } from "@/components/Groups/Panel";
import CreateUpdateProfilePicturePanel from "@/components/Panels/Media/CreateUpdateProfilePicturePanel";
import AuthProviderRow from "@/components/Partials/AuthProviderRow";
import DetailsList from "@/components/Partials/DetailsList";
import PanelTabs from "@/components/Partials/PanelTabs";
import ProfilePicturePreviewCard from "@/components/Partials/ProfilePicturePreviewCard";
import api from "@/services/api";
import userStore from "@/store/userStore";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";
import { getBodyError } from "@/utils/error-helpers";
import helpers from "@/utils/helpers";

const UpdateUserPanel: Component<{
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
}> = (props) => {
	// ------------------------------
	// State & Hooks
	const [getSelectedRoles, setSelectedRoles] = createSignal<
		SelectMultipleValueT[]
	>([]);
	const [getIsSuperAdmin, setIsSuperAdmin] = createSignal(false);
	const [getIsLocked, setIsLocked] = createSignal(false);
	const [getUnlinkingProviderKey, setUnlinkingProviderKey] =
		createSignal<string>();
	const [profilePicturePanelOpen, setProfilePicturePanelOpen] =
		createSignal(false);
	const [activeTab, setActiveTab] = createSignal<
		"options" | "details" | "auth_providers" | "meta"
	>("options");

	// ---------------------------------
	// Queries
	const roles = api.roles.useGetMultiple({
		queryParams: {
			include: {
				permissions: false,
			},
			perPage: -1,
		},
		enabled: () => !props.id(),
	});
	const user = api.users.useGetSingle({
		queryParams: {
			location: {
				userId: props.id,
			},
		},
		enabled: () => !!props.id(),
	});
	const providers = api.auth.useGetProviders({
		queryParams: {},
		enabled: () => userStore.get.user?.superAdmin ?? false,
	});

	// ---------------------------------
	// Mutations
	const updateUser = api.users.useUpdateSingle({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});
	const unlinkAuthProvider = api.users.useUnlinkAuthProvider({
		onMutate: (params) => {
			setUnlinkingProviderKey(params.providerKey);
		},
	});
	const deleteProfilePicture = api.users.useDeleteProfilePicture();

	// ---------------------------------
	// Memos
	const isLoading = createMemo(() => {
		return user.isLoading || roles.isLoading || providers.isLoading;
	});
	const isError = createMemo(() => {
		return user.isError || roles.isError || providers.isError;
	});
	const linkedProvidersByKey = createMemo(() => {
		const authProviders = user.data?.data.authProviders ?? [];
		return authProviders.reduce(
			(acc, provider) => {
				acc[provider.providerKey] = provider;
				return acc;
			},
			{} as Record<string, NonNullable<User["authProviders"]>[number]>,
		);
	});
	const updateData = createMemo(() => {
		return helpers.updateData(
			{
				roleIds: user.data?.data.roles?.map((role) => role.id),
				superAdmin: user.data?.data.superAdmin,
				isLocked: user.data?.data.isLocked,
			},
			{
				roleIds: getSelectedRoles().map((role) => role.value) as number[],
				superAdmin: getIsSuperAdmin(),
				isLocked: getIsLocked(),
			},
		);
	});
	const userRoles = createMemo(() => {
		return user.data?.data.roles?.map((role) => role.name).join(", ") || "-";
	});

	// ---------------------------------
	// Handlers
	const handleSubmit = () => {
		updateUser.action.mutate({
			id: props.id() as number,
			body: updateData().data,
		});
	};
	const handleReset = () => {
		updateUser.reset();
		deleteProfilePicture.reset();
	};
	const handleClearProfilePicture = () => {
		const userId = props.id();
		if (!userId) return;

		deleteProfilePicture.action.mutate({
			userId,
		});
	};

	// ---------------------------------
	// Effects
	createEffect(() => {
		if (user.isSuccess) {
			setSelectedRoles(
				user.data?.data.roles?.map((role) => {
					return {
						value: role.id,
						label: role.name,
					};
				}) || [],
			);
			setIsSuperAdmin(user.data?.data.superAdmin || false);
			setIsLocked(user.data?.data.isLocked || false);
		}
	});

	// ---------------------------------
	// Render
	return (
		<>
			<Panel
				state={{
					open: props.state.open,
					setOpen: props.state.setOpen,
				}}
				fetchState={{
					isLoading: isLoading(),
					isError: isError(),
				}}
				mutateState={{
					isLoading: updateUser.action.isPending,
					isDisabled: !updateData().changed,
					errors: updateUser.errors(),
				}}
				callbacks={{
					onSubmit: handleSubmit,
					reset: handleReset,
				}}
				copy={{
					title: T()("update_user_panel_title"),
					submit: T()("update"),
				}}
				options={{
					padding: "24",
				}}
			>
				{() => (
					<>
						<ProfilePicturePreviewCard
							user={{
								username: user.data?.data.username,
								firstName: user.data?.data.firstName,
								lastName: user.data?.data.lastName,
								profilePicture: user.data?.data.profilePicture,
							}}
							onEdit={() => setProfilePicturePanelOpen(true)}
							onClear={
								user.data?.data.profilePicture && props.id()
									? handleClearProfilePicture
									: undefined
							}
							clearLoading={deleteProfilePicture.action.isPending}
						/>
						<PanelTabs
							items={[
								{ value: "options", label: T()("options") },
								{ value: "details", label: T()("details") },
								{
									value: "auth_providers",
									label: T()("auth_providers"),
									show: userStore.get.user?.superAdmin,
								},
								{ value: "meta", label: T()("meta") },
							]}
							active={activeTab()}
							onChange={setActiveTab}
						/>
						<Show when={activeTab() === "options"}>
							<SelectMultiple
								id="roles"
								values={getSelectedRoles()}
								onChange={setSelectedRoles}
								name={"roles"}
								copy={{
									label: T()("roles"),
								}}
								options={
									roles.data?.data.map((role) => {
										return {
											value: role.id,
											label: role.name,
										};
									}) || []
								}
								errors={getBodyError("roleIds", updateUser.errors)}
							/>
							<Show when={userStore.get.user?.superAdmin}>
								<Switch
									id="superAdmin"
									value={getIsSuperAdmin()}
									onChange={setIsSuperAdmin}
									name={"superAdmin"}
									theme="relaxed"
									copy={{
										true: T()("yes"),
										false: T()("no"),
										label: T()("is_super_admin"),
									}}
									errors={getBodyError("superAdmin", updateUser.errors)}
									hideOptionalText={true}
								/>
								<Switch
									id="isLocked"
									value={getIsLocked()}
									onChange={setIsLocked}
									name={"isLocked"}
									theme="relaxed"
									copy={{
										true: T()("locked"),
										false: T()("unlocked"),
										label: T()("is_locked"),
									}}
									errors={getBodyError("isLocked", updateUser.errors)}
									hideOptionalText={true}
								/>
							</Show>
						</Show>
						<Show when={activeTab() === "details"}>
							<DetailsList
								type="text"
								items={[
									{
										label: T()("username"),
										value: user.data?.data.username || "-",
									},
									{
										label: T()("email"),
										value: user.data?.data.email || "-",
									},
									{
										label: T()("first_name"),
										value: user.data?.data.firstName || "-",
									},
									{
										label: T()("last_name"),
										value: user.data?.data.lastName || "-",
									},
									{
										label: T()("user_type"),
										value: user.data?.data.superAdmin
											? T()("super_admin")
											: T()("standard"),
										show: user.data?.data.superAdmin !== undefined,
									},
									{
										label: T()("roles"),
										value: userRoles(),
										show:
											user.data?.data.roles !== undefined &&
											user.data?.data.roles.length > 0,
									},
									{
										label: T()("is_locked"),
										value: user.data?.data.isLocked ? T()("yes") : T()("no"),
										show: user.data?.data.isLocked !== undefined,
									},
								]}
							/>
						</Show>
						<Show when={activeTab() === "auth_providers"}>
							<Show when={userStore.get.user?.superAdmin}>
								<Show
									when={(providers.data?.data.providers?.length ?? 0) > 0}
									fallback={
										<span class="text-sm text-body">{T()("no_results")}</span>
									}
								>
									<div class="flex flex-col gap-3">
										<For each={providers.data?.data.providers || []}>
											{(provider) => (
												<AuthProviderRow
													provider={provider}
													linkedProvider={linkedProvidersByKey()[provider.key]}
													isLoading={
														unlinkAuthProvider.action.isPending &&
														getUnlinkingProviderKey() === provider.key
													}
													onUnlink={() => {
														const userId = props.id();
														if (!userId) return;

														unlinkAuthProvider.action.mutate({
															userId,
															providerKey: provider.key,
														});
													}}
												/>
											)}
										</For>
									</div>
								</Show>
							</Show>
						</Show>
						<Show when={activeTab() === "meta"}>
							<DetailsList
								type="text"
								items={[
									{
										label: T()("created_at"),
										value: user.data?.data.createdAt
											? dateHelpers.formatDate(user.data?.data.createdAt)
											: "-",
									},
									{
										label: T()("updated_at"),
										value: user.data?.data.updatedAt
											? dateHelpers.formatDate(user.data?.data.updatedAt)
											: "-",
									},
								]}
							/>
						</Show>
					</>
				)}
			</Panel>
			<Show when={props.id()}>
				{(targetUserId) => (
					<CreateUpdateProfilePicturePanel
						state={{
							open: profilePicturePanelOpen(),
							setOpen: setProfilePicturePanelOpen,
							media: user.data?.data.profilePicture ?? null,
							userId: targetUserId(),
						}}
					/>
				)}
			</Show>
		</>
	);
};

export default UpdateUserPanel;
