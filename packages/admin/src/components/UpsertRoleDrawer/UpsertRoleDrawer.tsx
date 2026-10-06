import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import Drawer from "@/components/Drawer/Drawer";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import GrantPicker from "@/components/GrantPicker/GrantPicker";
import Input from "@/components/Input/Input";
import Textarea from "@/components/Textarea/Textarea";
import api from "@/services/api";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";
import helpers from "@/utils/helpers";

interface UpsertRolePanelProps {
	id?: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
	viewOnly?: boolean;
}

const UpsertRoleDrawer: Component<UpsertRolePanelProps> = (props) => {
	// ---------------------------------
	// State
	const [selectedPermissions, setSelectedPermissions] = createSignal<string[]>(
		[],
	);
	const [name, setName] = createSignal("");
	const [description, setDescription] = createSignal("");
	const [activeTab, setActiveTab] = createSignal("details");

	// ---------------------------------
	// Query
	const role = api.roles.useGetSingle({
		queryParams: {
			location: {
				roleId: props.id as Accessor<number | undefined>,
			},
		},
		key: () => props.state.open,
		enabled: () => props.state.open && props.id !== undefined,
	});
	const permissions = api.permissions.useGetAll({
		queryParams: {},
		enabled: () => props.state.open,
	});

	// ----------------------------------------
	// Mutations
	const createRole = api.roles.useCreateSingle({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});
	const updateRole = api.roles.useUpdateSingle({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});

	// ---------------------------------
	// Effects
	createEffect(() => {
		if (role.isSuccess) {
			setSelectedPermissions(
				role.data?.data.permissions?.map((p) => p.permission) || [],
			);
			setName(role.data?.data.name ?? "");
			setDescription(role.data?.data.description ?? "");
		}
	});

	// ---------------------------------
	// Memos
	const isLoading = createMemo(() => {
		if (props.id === undefined) return permissions.isLoading;
		return role.isLoading || permissions.isLoading;
	});
	const isError = createMemo(() => {
		if (props.id === undefined) return permissions.isError;
		return role.isError || permissions.isError;
	});
	const panelTitle = createMemo(() => {
		if (props.viewOnly) {
			return T()("panels.roles.view.title", {
				name: role.data?.data.name ?? "",
			});
		}
		if (props.id === undefined) return T()("panels.roles.create.title");
		return T()("panels.roles.update.title", {
			name: role.data?.data.name ?? "",
		});
	});
	const panelSubmit = createMemo(() => {
		if (props.id === undefined) return T()("common.create");
		return T()("common.update");
	});
	const isLocked = createMemo(() => role.data?.data.locked === true);
	const isReadOnly = createMemo(() => props.viewOnly === true || isLocked());
	const errors = createMemo(() => {
		if (!props.id) return createRole.errors();
		return updateRole.errors();
	});
	const permissionGroups = createMemo(() =>
		(permissions.data?.data ?? []).map((group) => ({
			key: group.key,
			details: group.details,
			grants: group.permissions,
		})),
	);
	const tabInvalid = (fields: string[]) =>
		fields.some((field) => getBodyError(field, errors) !== undefined);

	const updateData = createMemo(() => {
		return helpers.updateData(
			{
				name: role.data?.data.name ?? "",
				description: role.data?.data.description ?? "",
				permissions:
					role.data?.data.permissions?.map(
						(permission) => permission.permission,
					) || [],
			},
			{
				name: name(),
				description: description(),
				permissions: selectedPermissions() || [],
			},
		);
	});
	const submitIsDisabled = createMemo(() => {
		if (isReadOnly()) return true;
		if (!props.id) return false;
		return !updateData().changed;
	});

	// Mutation memos
	const isCreating = createMemo(() => {
		return createRole.action.isPending || updateRole.action.isPending;
	});

	// ---------------------------------
	// Return
	return (
		<Drawer.Root
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			loading={isLoading()}
			error={isError() ? T()("errors.generic.message") : undefined}
			onReset={() => {
				setSelectedPermissions([]);
				setName("");
				setDescription("");
				setActiveTab("details");
				createRole.reset();
				updateRole.reset();
			}}
		>
			<Drawer.Header border={false}>
				<Drawer.Title>{panelTitle()}</Drawer.Title>
				<Show
					when={
						isLocked() ? T()("roles.config.managed.description") : undefined
					}
				>
					{(description) => (
						<Drawer.Description>{description()}</Drawer.Description>
					)}
				</Show>
			</Drawer.Header>
			<Drawer.Form
				onSubmit={
					props.viewOnly
						? undefined
						: () => {
								if (!props.id) {
									createRole.action.mutate({
										name: name(),
										description: description(),
										permissions: selectedPermissions(),
									});
								} else {
									updateRole.action.mutate({
										id: props.id() as number,
										body: updateData().data,
									});
								}
							}
				}
			>
				<Drawer.Body class="flex flex-col gap-3">
					<Drawer.Tabs
						items={[
							{
								value: "details",
								label: T()("common.details"),
								invalid: tabInvalid(["name", "description"]),
							},
							{
								value: "permissions",
								label: T()("common.permissions"),
								invalid: tabInvalid(["permissions"]),
							},
						]}
						value={activeTab()}
						onChange={setActiveTab}
					/>
					<Show when={activeTab() === "details"}>
						<Input
							id="name"
							name="name"
							type="text"
							value={name()}
							onChange={setName}
							disabled={isReadOnly()}
							label={T()("common.name")}
							required={true}
							errors={getBodyError("name", errors)}
						/>
						<Textarea
							id="description"
							name="description"
							value={description()}
							onChange={setDescription}
							disabled={isReadOnly()}
							label={T()("common.description")}
							errors={getBodyError("description", errors)}
							rows={4}
						/>
					</Show>
					<Show when={activeTab() === "permissions"}>
						<GrantPicker
							id="permissions"
							groups={permissionGroups()}
							value={selectedPermissions()}
							onChange={setSelectedPermissions}
							disabled={isReadOnly()}
						/>
					</Show>
				</Drawer.Body>
				<Drawer.Footer>
					<ErrorMessage theme="basic" message={errors()?.message} />
					<Drawer.Actions>
						<Button
							size="md"
							variant="outline"
							onClick={() => props.state.setOpen(false)}
						>
							{T()("common.close")}
						</Button>
						<Show when={props.viewOnly ? undefined : panelSubmit()}>
							<Button
								type="submit"
								variant="primary"
								size="md"
								loading={isCreating()}
								disabled={submitIsDisabled()}
							>
								{props.viewOnly ? undefined : panelSubmit()}
							</Button>
						</Show>
					</Drawer.Actions>
				</Drawer.Footer>
			</Drawer.Form>
		</Drawer.Root>
	);
};

export default UpsertRoleDrawer;
