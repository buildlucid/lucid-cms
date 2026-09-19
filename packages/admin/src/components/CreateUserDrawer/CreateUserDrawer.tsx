import { type Component, createMemo, createSignal, Show } from "solid-js";
import Button from "@/components/Button/Button";
import { Checkbox } from "@/components/Checkbox/Checkbox";
import { Drawer } from "@/components/Drawer/Drawer";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import { Input } from "@/components/Input/Input";
import InputGrid from "@/components/InputGrid/InputGrid";
import type { SelectMultipleValueT } from "@/components/SelectMultiple/SelectMultiple";
import { SelectMultiple } from "@/components/SelectMultiple/SelectMultiple";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";

interface CreateUserPanelProps {
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
}

const CreateUserDrawer: Component<CreateUserPanelProps> = (props) => {
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
	const roleOptions = createMemo(() => {
		return (
			roles.data?.data.map((role) => ({
				value: role.id,
				label: role.name,
			})) ?? []
		);
	});
	// ---------------------------------
	// Render
	return (
		<Drawer.Root
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			loading={isLoading()}
			error={isError() ? T()("errors.generic.message") : undefined}
			onReset={() => {
				createUser.reset();
				setUsername("");
				setFirstName("");
				setLastName("");
				setEmail("");
				setIsSuperAdmin(false);
				setSelectedRoles([]);
			}}
		>
			<Drawer.Header>
				<Drawer.Title>{T()("panels.users.create.title")}</Drawer.Title>
				<Drawer.Description>
					{T()("panels.users.create.description")}
				</Drawer.Description>
			</Drawer.Header>
			<Drawer.Form
				onSubmit={() => {
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
				}}
			>
				<Drawer.Body class="flex flex-col gap-3">
					<Input
						id="username"
						value={getUsername()}
						onChange={setUsername}
						name={"username"}
						type="text"
						label={T()("common.username")}
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
							label={T()("common.first.name")}
							errors={getBodyError("firstName", createUser.errors)}
						/>
						<Input
							id="lastName"
							value={getLastName()}
							onChange={setLastName}
							name={"lastName"}
							type="text"
							label={T()("common.last.name")}
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
							label={T()("common.email")}
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
				</Drawer.Body>
				<Drawer.Footer>
					<ErrorMessage theme="basic" message={createUser.errors()?.message} />
					<Drawer.Actions>
						<Button
							size="md"
							variant="outline"
							onClick={() => props.state.setOpen(false)}
						>
							{T()("common.close")}
						</Button>
						<Button
							type="submit"
							variant="primary"
							size="md"
							loading={mutationIsPending()}
						>
							{T()("common.create")}
						</Button>
					</Drawer.Actions>
				</Drawer.Footer>
			</Drawer.Form>
		</Drawer.Root>
	);
};

export default CreateUserDrawer;
