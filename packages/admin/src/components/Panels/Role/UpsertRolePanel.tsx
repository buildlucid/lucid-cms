import type { Permission } from "@types";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
} from "solid-js";
import InputGrid from "@/components/Containers/InputGrid";
import { CheckboxButton, Input } from "@/components/Groups/Form";
import { Panel } from "@/components/Groups/Panel";
import api from "@/services/api";
import T, { type TranslationKeys } from "@/translations";
import { permissionKeyToTranslation } from "@/translations/helpers";
import { getBodyError } from "@/utils/error-helpers";
import helpers from "@/utils/helpers";

interface UpsertRolePanelProps {
	id?: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
}

const UpsertRolePanel: Component<UpsertRolePanelProps> = (props) => {
	// ---------------------------------
	// State
	const [selectedPermissions, setSelectedPermissions] = createSignal<
		Permission[]
	>([]);
	const [getName, setName] = createSignal("");

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
			setName(role.data?.data.name || "");
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
		if (props.id === undefined) return T()("create_role_panel_title");
		return T()("update_role_panel_title", {
			name: role.data?.data.name || "",
		});
	});
	const panelSubmit = createMemo(() => {
		if (props.id === undefined) return T()("create");
		return T()("update");
	});

	const updateData = createMemo(() => {
		return helpers.updateData(
			{
				name: role.data?.data.name,
				permissions:
					role.data?.data.permissions?.map(
						(permission) => permission.permission,
					) || [],
			},
			{
				name: getName(),
				permissions: selectedPermissions() || [],
			},
		);
	});
	const submitIsDisabled = createMemo(() => {
		if (!props.id) return false;
		return !updateData().changed;
	});

	// Mutation memos
	const isCreating = createMemo(() => {
		return createRole.action.isPending || updateRole.action.isPending;
	});
	const errors = createMemo(() => {
		if (!props.id) return createRole.errors();
		return updateRole.errors();
	});

	// ---------------------------------
	// Return
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
				isLoading: isCreating(),
				isDisabled: submitIsDisabled(),
				errors: errors(),
			}}
			callbacks={{
				onSubmit: () => {
					if (!props.id) {
						createRole.action.mutate({
							name: getName(),
							permissions: selectedPermissions(),
						});
					} else {
						updateRole.action.mutate({
							id: props.id() as number,
							body: updateData().data,
						});
					}
				},
				reset: () => {
					setSelectedPermissions([]);
					setName("");
					createRole.reset();
					updateRole.reset();
				},
			}}
			copy={{
				title: panelTitle(),
				submit: panelSubmit(),
			}}
			options={{
				padding: "24",
			}}
		>
			{() => (
				<>
					<InputGrid columns={2}>
						<Input
							id="name"
							name="name"
							type="text"
							value={getName()}
							onChange={setName}
							copy={{
								label: T()("name"),
							}}
							required={true}
							errors={getBodyError("name", errors)}
							noMargin={true}
						/>
					</InputGrid>
					<div class="w-full mb-5 last:mb-0">
						<div class="mb-1.5">
							<h3 class="text-sm text-body">{T()("permissions")}</h3>
						</div>
						<div class="w-full">
							<For each={permissions?.data?.data}>
								{(option) => (
									<div class="mb-3 last:mb-0 p-3 rounded-md border border-border bg-card-base">
										<div class="flex justify-between items-start gap-3">
											<h4 class="text-sm font-medium text-body">
												{T()(option.key as TranslationKeys)}
											</h4>
											<button
												type="button"
												class="text-xs text-unfocused hover:text-body transition-colors"
												onClick={() => {
													const groupIsSelected = option.permissions.every(
														(permission) =>
															selectedPermissions().includes(permission),
													);

													if (groupIsSelected) {
														setSelectedPermissions((prev) =>
															prev.filter(
																(permission) =>
																	!option.permissions.includes(permission),
															),
														);
														return;
													}

													setSelectedPermissions((prev) => [
														...new Set([...prev, ...option.permissions]),
													]);
												}}
											>
												{option.permissions.every((permission) =>
													selectedPermissions().includes(permission),
												)
													? T()("clear")
													: T()("select_all")}
											</button>
										</div>
										<div class="mt-2 flex flex-wrap gap-2">
											<For each={option.permissions}>
												{(permission) => (
													<CheckboxButton
														id={`permission-${option.key}-${permission}`}
														value={selectedPermissions().includes(permission)}
														onChange={() => {
															setSelectedPermissions((prev) => {
																if (prev.includes(permission)) {
																	return prev.filter((p) => p !== permission);
																}
																return [...prev, permission];
															});
														}}
														copy={{
															label: T()(
																permissionKeyToTranslation(permission),
															),
														}}
														theme="secondary"
													/>
												)}
											</For>
										</div>
									</div>
								)}
							</For>
						</div>
					</div>
				</>
			)}
		</Panel>
	);
};

export default UpsertRolePanel;
