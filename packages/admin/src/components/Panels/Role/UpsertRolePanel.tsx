import type { Permission } from "@types";
import { FaSolidTriangleExclamation } from "solid-icons/fa";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Show,
} from "solid-js";
import InputGrid from "@/components/Containers/InputGrid";
import { CheckboxButton, Input, Textarea } from "@/components/Groups/Form";
import { Panel } from "@/components/Groups/Panel";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";
import helpers from "@/utils/helpers";
import {
	createDefaultTranslations,
	getDefaultTranslationLocale,
	getTranslation,
	mergeTranslations,
	type TranslationValue,
	updateTranslation,
} from "@/utils/translation-helpers";

interface UpsertRolePanelProps {
	id?: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
	viewOnly?: boolean;
}

type RoleTranslation = TranslationValue;

const UpsertRolePanel: Component<UpsertRolePanelProps> = (props) => {
	// ---------------------------------
	// State
	const [selectedPermissions, setSelectedPermissions] = createSignal<
		Permission[]
	>([]);
	const [nameTranslations, setNameTranslations] = createSignal<
		RoleTranslation[]
	>(createDefaultTranslations<RoleTranslation>(contentLocaleStore.get.locales));
	const [descriptionTranslations, setDescriptionTranslations] = createSignal<
		RoleTranslation[]
	>(createDefaultTranslations<RoleTranslation>(contentLocaleStore.get.locales));

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
			const locales = contentLocaleStore.get.locales;
			setSelectedPermissions(
				role.data?.data.permissions?.map((p) => p.permission) || [],
			);
			setNameTranslations(
				mergeTranslations<RoleTranslation>({
					translations: role.data?.data.name,
					locales,
				}),
			);
			setDescriptionTranslations(
				mergeTranslations<RoleTranslation>({
					translations: role.data?.data.description,
					locales,
				}),
			);
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
	const roleLocales = createMemo(() => contentLocaleStore.get.locales);
	const defaultRoleLocale = createMemo(() =>
		getDefaultTranslationLocale(roleLocales()),
	);
	const roleDisplayName = createMemo(() => {
		return (
			getTranslation(
				role.data?.data.name,
				contentLocaleStore.get.contentLocale,
			) ??
			getTranslation(role.data?.data.name, defaultRoleLocale()) ??
			""
		);
	});

	const panelTitle = createMemo(() => {
		if (props.viewOnly) {
			return T()("view_role_panel_title", {
				name: roleDisplayName(),
			});
		}
		if (props.id === undefined) return T()("create_role_panel_title");
		return T()("update_role_panel_title", {
			name: roleDisplayName(),
		});
	});
	const panelSubmit = createMemo(() => {
		if (props.id === undefined) return T()("create");
		return T()("update");
	});
	const isLocked = createMemo(() => role.data?.data.locked === true);
	const isReadOnly = createMemo(() => props.viewOnly === true || isLocked());
	const errors = createMemo(() => {
		if (!props.id) return createRole.errors();
		return updateRole.errors();
	});
	const hasTranslationErrors = createMemo(() => {
		return Boolean(
			getBodyError("name", errors) || getBodyError("description", errors),
		);
	});

	const updateData = createMemo(() => {
		return helpers.updateData(
			{
				name:
					role.data?.data.name ??
					createDefaultTranslations<RoleTranslation>(roleLocales()),
				description:
					role.data?.data.description ??
					createDefaultTranslations<RoleTranslation>(roleLocales()),
				permissions:
					role.data?.data.permissions?.map(
						(permission) => permission.permission,
					) || [],
			},
			{
				name: nameTranslations(),
				description: descriptionTranslations(),
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
									name: nameTranslations(),
									description: descriptionTranslations(),
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
					setNameTranslations(
						createDefaultTranslations<RoleTranslation>(roleLocales()),
					);
					setDescriptionTranslations(
						createDefaultTranslations<RoleTranslation>(roleLocales()),
					);
					createRole.reset();
					updateRole.reset();
				},
			}}
			copy={{
				title: panelTitle(),
				description: isLocked()
					? T()("config_managed_role_description")
					: undefined,
				descriptionIcon: isLocked() ? (
					<FaSolidTriangleExclamation size="14" />
				) : undefined,
				submit: props.viewOnly ? undefined : panelSubmit(),
			}}
			options={{
				padding: "24",
			}}
			langauge={{
				contentLocale: true,
				hascontentLocaleError: hasTranslationErrors(),
				useDefaultcontentLocale: true,
			}}
		>
			{(lang) => {
				const activeLocale = () => lang?.contentLocale() ?? defaultRoleLocale();

				return (
					<>
						<InputGrid columns={2}>
							<Input
								id={`name-${activeLocale()}`}
								name={`name-${activeLocale()}`}
								type="text"
								value={getTranslation(nameTranslations(), activeLocale()) ?? ""}
								onChange={(value) => {
									updateTranslation(setNameTranslations, {
										localeCode: activeLocale(),
										value,
									});
								}}
								disabled={isReadOnly()}
								copy={{
									label: T()("name"),
								}}
								required={true}
								errors={getBodyError("name", errors)}
								noMargin={true}
							/>
						</InputGrid>
						<Textarea
							id={`description-${activeLocale()}`}
							name={`description-${activeLocale()}`}
							value={
								getTranslation(descriptionTranslations(), activeLocale()) ?? ""
							}
							onChange={(value) => {
								updateTranslation(setDescriptionTranslations, {
									localeCode: activeLocale(),
									value,
								});
							}}
							disabled={isReadOnly()}
							copy={{
								label: T()("description"),
							}}
							errors={getBodyError("description", errors)}
							rows={4}
						/>
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
																	selectedPermissions().includes(
																		permission.key,
																	),
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
															? T()("clear")
															: T()("select_all")}
													</button>
												</Show>
											</div>
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
				);
			}}
		</Panel>
	);
};

export default UpsertRolePanel;
