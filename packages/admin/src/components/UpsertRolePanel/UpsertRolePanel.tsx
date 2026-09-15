import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Show,
} from "solid-js";
import { CheckboxButton } from "@/components/CheckboxButton/CheckboxButton";
import { Input } from "@/components/Input/Input";
import InputGrid from "@/components/InputGrid/InputGrid";
import { Panel } from "@/components/Panel/Panel";
import { Textarea } from "@/components/Textarea/Textarea";
import UnavailableGrants from "@/components/UnavailableGrants/UnavailableGrants";
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

const UpsertRolePanel: Component<UpsertRolePanelProps> = (props) => {
	// ---------------------------------
	// State
	const [selectedPermissions, setSelectedPermissions] = createSignal<string[]>(
		[],
	);
	const [name, setName] = createSignal("");
	const [description, setDescription] = createSignal("");

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
				onSubmit: props.viewOnly
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
						},
				reset: () => {
					setSelectedPermissions([]);
					setName("");
					setDescription("");
					createRole.reset();
					updateRole.reset();
				},
			}}
			copy={{
				title: panelTitle(),
				description: isLocked()
					? T()("roles.config.managed.description")
					: undefined,
				submit: props.viewOnly ? undefined : panelSubmit(),
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
							value={name()}
							onChange={setName}
							disabled={isReadOnly()}
							copy={{
								label: T()("common.name"),
							}}
							required={true}
							errors={getBodyError("name", errors)}
							noMargin={true}
						/>
					</InputGrid>
					<Textarea
						id="description"
						name="description"
						value={description()}
						onChange={setDescription}
						disabled={isReadOnly()}
						copy={{
							label: T()("common.description"),
						}}
						errors={getBodyError("description", errors)}
						rows={4}
					/>
					<div class="w-full mb-5 last:mb-0">
						<div class="mb-1.5">
							<h3 class="text-sm text-body">{T()("common.permissions")}</h3>
						</div>
						<div class="w-full">
							<UnavailableGrants
								keys={selectedPermissions().filter(
									(key) =>
										!permissions.data?.data.some((group) =>
											group.permissions.some(
												(permission) => permission.key === key,
											),
										),
								)}
								onRemove={(key) =>
									setSelectedPermissions((values) =>
										values.filter((value) => value !== key),
									)
								}
								disabled={isReadOnly()}
							/>
							<For each={permissions?.data?.data}>
								{(option) => (
									<div class="mb-3 last:mb-0 p-3 rounded-md border border-border bg-card-base">
										<div class="flex justify-between items-start gap-3">
											<h4 class="text-sm font-medium text-body">
												{helpers.getLocaleValue({
													value: option.details.name,
													fallback: option.key,
												})}
											</h4>
											<Show when={!isReadOnly()}>
												<button
													type="button"
													class="text-xs text-unfocused hover:text-body transition-colors"
													onClick={() => {
														const groupIsSelected = option.permissions.every(
															(permission) =>
																selectedPermissions().includes(permission.key),
														);

														if (groupIsSelected) {
															setSelectedPermissions((prev) =>
																prev.filter(
																	(permission) =>
																		!option.permissions.some(
																			(optionPermission) =>
																				optionPermission.key === permission,
																		),
																),
															);
															return;
														}

														setSelectedPermissions((prev) => [
															...new Set([
																...prev,
																...option.permissions.map(
																	(permission) => permission.key,
																),
															]),
														]);
													}}
												>
													{option.permissions.every((permission) =>
														selectedPermissions().includes(permission.key),
													)
														? T()("common.clear")
														: T()("selectors.all")}
												</button>
											</Show>
										</div>
										<Show when={option.details.description}>
											<p class="text-xs text-unfocused mt-1">
												{helpers.getLocaleValue({
													value: option.details.description,
												})}
											</p>
										</Show>
										<div class="mt-2 flex flex-wrap gap-2">
											<For each={option.permissions}>
												{(permission) => (
													<CheckboxButton
														id={`permission-${option.key}-${permission.key}`}
														value={selectedPermissions().includes(
															permission.key,
														)}
														onChange={() => {
															setSelectedPermissions((prev) => {
																if (prev.includes(permission.key)) {
																	return prev.filter(
																		(p) => p !== permission.key,
																	);
																}
																return [...prev, permission.key];
															});
														}}
														copy={{
															label: helpers.getLocaleValue({
																value: permission.details.name,
																fallback: permission.key,
															}),
															tooltip:
																helpers.getLocaleValue({
																	value: permission.details.description,
																}) || undefined,
														}}
														disabled={isReadOnly()}
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
