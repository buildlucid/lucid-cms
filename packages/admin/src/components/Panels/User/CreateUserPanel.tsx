import T from "@/translations";
import { type Component, Show, createMemo, createSignal } from "solid-js";
import type { SelectMultipleValueT } from "@/components/Groups/Form/SelectMultiple";
import userStore from "@/store/userStore";
import api from "@/services/api";
import { getBodyError } from "@/utils/error-helpers";
import { Panel } from "@/components/Groups/Panel";
import { Input, Checkbox, SelectMultiple } from "@/components/Groups/Form";
import InputGrid from "@/components/Containers/InputGrid";

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
				},
			}}
			copy={{
				title: T()("create_user_panel_title"),
				description: T()("create_user_panel_description"),
				submit: T()("create"),
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
							label: T()("username"),
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
								label: T()("first_name"),
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
								label: T()("last_name"),
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
								label: T()("email"),
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
						errors={getBodyError("roleIds", createUser.errors)}
					/>
					<Show when={userStore.get.user?.superAdmin}>
						<Checkbox
							id="superAdmin"
							value={getIsSuperAdmin()}
							onChange={(value) => setIsSuperAdmin(value)}
							name={"superAdmin"}
							copy={{
								label: T()("is_super_admin"),
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
