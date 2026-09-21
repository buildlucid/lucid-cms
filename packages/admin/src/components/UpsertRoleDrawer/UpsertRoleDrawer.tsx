import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import Checkbox from "@/components/Checkbox/Checkbox";
import Drawer from "@/components/Drawer/Drawer";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import Input from "@/components/Input/Input";
import InputGrid from "@/components/InputGrid/InputGrid";
import Textarea from "@/components/Textarea/Textarea";
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

const UpsertRoleDrawer: Component<UpsertRolePanelProps> = (props) => {
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
		<Drawer.Root
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			loading={isLoading()}
			error={isError() ? T()("errors.generic.message") : undefined}
			onReset={() => {
				setSelectedPermissions([]);
				setName("");
				setDescription("");
				createRole.reset();
				updateRole.reset();
			}}
		>
			<Drawer.Header>
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
					<InputGrid columns={2}>
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
					</InputGrid>
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
					<div class="w-full">
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
													<Checkbox
														variant="button-secondary"
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
														label={helpers.getLocaleValue({
															value: permission.details.name,
															fallback: permission.key,
														})}
														tooltip={
															helpers.getLocaleValue({
																value: permission.details.description,
															}) || undefined
														}
														disabled={isReadOnly()}
													/>
												)}
											</For>
										</div>
									</div>
								)}
							</For>
						</div>
					</div>
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
