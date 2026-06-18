import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Show,
} from "solid-js";
import InputGrid from "@/components/Containers/InputGrid";
import { Checkbox, Input, SelectMultiple } from "@/components/Groups/Form";
import type { SelectMultipleValueT } from "@/components/Groups/Form/SelectMultiple";
import { Panel } from "@/components/Groups/Panel";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore";
import tenantStore from "@/store/tenantStore";
import userStore from "@/store/userStore";
import T, { translateAdminCopy } from "@/translations";
import { getBodyError } from "@/utils/error-helpers";
import {
	getDefaultTranslationLocale,
	getTranslation,
} from "@/utils/translation-helpers";

interface CreateUserPanelProps {
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
}

const CreateUserPanel: Component<CreateUserPanelProps> = (props) => {
	// ------------------------------
	// State
	const [getSelectedRoles, setSelectedRoles] = createSignal<
		SelectMultipleValueT[]
	>([]);
	const [getSelectedTenants, setSelectedTenants] = createSignal<
		SelectMultipleValueT[]
	>([]);
	const [getUsername, setUsername] = createSignal<string>("");
	const [getFirstName, setFirstName] = createSignal<string>("");
	const [getLastName, setLastName] = createSignal<string>("");
	const [getEmail, setEmail] = createSignal<string>("");
	const [getIsSuperAdmin, setIsSuperAdmin] = createSignal(false);

	// ---------------------------------
	// Queries
	const roles = api.roles.useGetMultiple({
		queryParams: {
			include: {
				permissions: false,
			},
			perPage: -1,
		},
		enabled: () => props.state.open,
	});

	// ---------------------------------
	// Mutations
	const createUser = api.users.useCreateSingle({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});

	// ---------------------------------
	// Memos
	const isLoading = createMemo(() => {
		return roles.isLoading;
	});
	const isError = createMemo(() => {
		return roles.isError;
	});
	const mutationIsPending = createMemo(() => {
		return createUser.action.isPending;
	});
	const defaultRoleLocale = createMemo(() => {
		return getDefaultTranslationLocale(contentLocaleStore.get.locales);
	});
	const roleOptions = createMemo(() => {
		return (
			roles.data?.data.map((role) => ({
				value: role.id,
				label:
					getTranslation(role.name, contentLocaleStore.get.contentLocale) ??
					getTranslation(role.name, defaultRoleLocale()) ??
					"-",
			})) ?? []
		);
	});
	const tenantOptions = createMemo(() => {
		return tenantStore.get.tenants.map((tenant) => ({
			value: tenant.key,
			label: `${translateAdminCopy(tenant.name)} (${tenant.key})`,
		}));
	});
	const defaultTenantOption = createMemo(() => {
		const tenantKey =
			tenantStore.get.tenant ??
			tenantStore.get.tenants.find((tenant) => tenant.default)?.key ??
			tenantStore.get.tenants[0]?.key;

		return tenantOptions().find((tenant) => tenant.value === tenantKey);
	});
	const showTenantSelect = createMemo(() => {
		return Boolean(
			userStore.get.user?.superAdmin && tenantOptions().length > 0,
		);
	});

	// ---------------------------------
	// Effects
	createEffect(() => {
		if (!props.state.open) return;
		if (!showTenantSelect()) return;
		if (getIsSuperAdmin()) return;
		if (getSelectedTenants().length > 0) return;

		const defaultTenant = defaultTenantOption();
		if (defaultTenant === undefined) return;

		setSelectedTenants([defaultTenant]);
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
				isLoading: mutationIsPending(),
				errors: createUser.errors(),
			}}
			callbacks={{
				onSubmit: () => {
					createUser.action.mutate({
						body: {
							email: getEmail(),
							username: getUsername(),
							firstName: getFirstName() || undefined,
							lastName: getLastName() || undefined,
							superAdmin: userStore.get.user?.superAdmin
								? getIsSuperAdmin()
								: undefined,
							roleIds: getSelectedRoles().map((role) => role.value) as number[],
							tenantKeys: userStore.get.user?.superAdmin
								? (getSelectedTenants().map(
										(tenant) => tenant.value,
									) as string[])
								: undefined,
						},
					});
				},
				reset: () => {
					createUser.reset();
					setUsername("");
					setFirstName("");
					setLastName("");
					setEmail("");
					setIsSuperAdmin(false);
					setSelectedRoles([]);
					setSelectedTenants([]);
				},
			}}
			copy={{
				title: T()("panels.users.create.title"),
				description: T()("panels.users.create.description"),
				submit: T()("common.create"),
			}}
			options={{
				padding: "24",
			}}
		>
			{() => (
				<>
					<Input
						id="username"
						value={getUsername()}
						onChange={setUsername}
						name={"username"}
						type="text"
						copy={{
							label: T()("common.username"),
						}}
						required={true}
						errors={getBodyError("username", createUser.errors)}
					/>
					<InputGrid columns={2}>
						<Input
							id="firstName"
							value={getFirstName()}
							onChange={setFirstName}
							name={"firstName"}
							type="text"
							copy={{
								label: T()("common.first.name"),
							}}
							noMargin={true}
							errors={getBodyError("firstName", createUser.errors)}
						/>
						<Input
							id="lastName"
							value={getLastName()}
							onChange={setLastName}
							name={"lastName"}
							type="text"
							copy={{
								label: T()("common.last.name"),
							}}
							noMargin={true}
							errors={getBodyError("lastName", createUser.errors)}
						/>
					</InputGrid>
					<InputGrid columns={1}>
						<Input
							id="email"
							value={getEmail()}
							onChange={setEmail}
							name={"email"}
							type="text"
							copy={{
								label: T()("common.email"),
							}}
							noMargin={true}
							required={true}
							errors={getBodyError("email", createUser.errors)}
						/>
					</InputGrid>
					<SelectMultiple
						id="roleIds"
						values={getSelectedRoles()}
						onChange={setSelectedRoles}
						name={"roleIds"}
						copy={{
							label: T()("common.roles"),
						}}
						options={roleOptions()}
						errors={getBodyError("roleIds", createUser.errors)}
					/>
					<Show when={showTenantSelect()}>
						<SelectMultiple
							id="tenantKeys"
							values={getSelectedTenants()}
							onChange={setSelectedTenants}
							name={"tenantKeys"}
							copy={{
								label: T()("common.tenants"),
							}}
							required={!getIsSuperAdmin()}
							options={tenantOptions()}
							errors={getBodyError("tenantKeys", createUser.errors)}
						/>
					</Show>
					<Show when={userStore.get.user?.superAdmin}>
						<Checkbox
							id="superAdmin"
							value={getIsSuperAdmin()}
							onChange={(value) => setIsSuperAdmin(value)}
							name={"superAdmin"}
							copy={{
								label: T()("users.super.admin.label"),
							}}
							errors={getBodyError("superAdmin", createUser.errors)}
						/>
					</Show>
				</>
			)}
		</Panel>
	);
};

export default CreateUserPanel;
