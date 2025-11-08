import T from "@/translations";
import {
	type Component,
	type Accessor,
	createMemo,
	createSignal,
	createEffect,
	Show,
	For,
} from "solid-js";
import type { SelectMultipleValueT } from "@/components/Groups/Form/SelectMultiple";
import api from "@/services/api";
import { getBodyError } from "@/utils/error-helpers";
import userStore from "@/store/userStore";
import helpers from "@/utils/helpers";
import { Panel } from "@/components/Groups/Panel";
import { SelectMultiple, Switch } from "@/components/Groups/Form";
import Spinner from "@/components/Partials/Spinner";
import type { UserResponse } from "@types";
import AuthProviderRow from "@/components/Partials/AuthProviderRow";
import SectionHeading from "@/components/Blocks/SectionHeading";

const UpdateUserPanel: Component<{
	id: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
}> = (props) => {
	// ------------------------------
	// State
	const [getSelectedRoles, setSelectedRoles] = createSignal<
		SelectMultipleValueT[]
	>([]);
	const [getIsSuperAdmin, setIsSuperAdmin] = createSignal(false);
	const [getIsLocked, setIsLocked] = createSignal(false);
	const [getUnlinkingProviderKey, setUnlinkingProviderKey] =
		createSignal<string>();

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
			{} as Record<string, NonNullable<UserResponse["authProviders"]>[number]>,
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

	// ---------------------------------
	// Render
	return (
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
				onSubmit: () => {
					updateUser.action.mutate({
						id: props.id() as number,
						body: updateData().data,
					});
				},
				reset: () => {
					updateUser.reset();
				},
			}}
			copy={{
				title: T()("update_user_panel_title"),
				description: T()("update_user_panel_description"),
				submit: T()("update"),
			}}
			options={{
				padding: "24",
			}}
		>
			{() => (
				<>
					<SectionHeading title={T()("details")} />
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
						<>
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
						</>
					</Show>
					<Show when={userStore.get.user?.superAdmin}>
						<SectionHeading title={T()("auth_providers")} />
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
				</>
			)}
		</Panel>
	);
};

export default UpdateUserPanel;
