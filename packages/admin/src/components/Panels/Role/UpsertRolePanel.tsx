import T from "@/translations";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
} from "solid-js";
import api from "@/services/api";
import helpers from "@/utils/helpers";
import { getBodyError } from "@/utils/error-helpers";
import { Panel } from "@/components/Groups/Panel";
import SectionHeading from "@/components/Blocks/SectionHeading";
import { Checkbox, Input } from "@/components/Groups/Form";
import InputGrid from "@/components/Containers/InputGrid";

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
	const [selectedPermissions, setSelectedPermissions] = createSignal<string[]>(
		[],
	);
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
	const panelDescription = createMemo(() => {
		if (props.id === undefined) return T()("create_role_panel_description");
		return T()("update_role_panel_description", {
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

	const allSelected = createMemo(() => {
		const totalOptionPerms = permissions.data?.data.reduce((acc, option) => {
			return acc + option.permissions.length;
		}, 0);

		if (selectedPermissions().length === totalOptionPerms) {
			return true;
		}
		return false;
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
				description: panelDescription(),
				submit: panelSubmit(),
			}}
			options={{
				padding: "24",
			}}
		>
			{() => (
				<>
					{/* Details */}
					<SectionHeading title={T()("details")} />
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
					{/* Global perms */}
					<div class="w-full mb-5 last:mb-0">
						<SectionHeading title={T()("permissions")} headingType="h3">
							<div>
								<Checkbox
									value={allSelected()}
									onChange={(value) => {
										if (value) {
											setSelectedPermissions(
												permissions.data?.data.flatMap(
													(option) => option.permissions,
												) || [],
											);
										} else {
											setSelectedPermissions([]);
										}
									}}
									copy={{}}
									noMargin={true}
								/>
							</div>
						</SectionHeading>
						<div class="w-full">
							<For each={permissions?.data?.data}>
								{(option) => (
									<div class="mb-4 last:mb-0">
										{/* @ts-expect-error */}
										<h4>{T(option.key)}</h4>
										<div class="mt-2 border border-border p-4 rounded-md grid grid-cols-2 gap-x-4 gap-y-2 bg-card-base">
											<For each={option.permissions}>
												{(permission) => (
													<Checkbox
														value={selectedPermissions().includes(permission)}
														onChange={() =>
															setSelectedPermissions((prev) => {
																if (prev.includes(permission)) {
																	return prev.filter((p) => p !== permission);
																}
																return [...prev, permission];
															})
														}
														copy={{
															label: T()(
																// @ts-expect-error
																`permissions_${permission}`,
															),
														}}
														noMargin={true}
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
