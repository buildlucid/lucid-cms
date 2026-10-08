import { useIsFetching } from "@tanstack/solid-query";
import type { NotificationType, Role } from "@types";
import classnames from "classnames";
import { TbOutlineChevronDown } from "solid-icons/tb";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import Checkbox from "@/components/Checkbox/Checkbox";
import SelectMultiple from "@/components/SelectMultiple/SelectMultiple";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import type { Params as UpdateTypeSettingsParams } from "@/services/api/notifications/useUpdateTypeSettings";
import { queryKeys } from "@/services/query-keys";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";

export interface NotificationTypeSettingsProps {
	type: NotificationType;
	roles: Role[];
}

const NotificationTypeSettings: Component<NotificationTypeSettingsProps> = (
	props,
) => {
	// ----------------------------------------
	// State & Hooks
	const [rolesOpen, setRolesOpen] = createSignal(false);

	// ----------------------------------------
	// Queries & Mutations
	const update = api.notifications.useUpdateTypeSettings();
	const typesFetching = useIsFetching(() => ({
		queryKey: queryKeys.notifications.types(),
	}));

	// ----------------------------------------
	// Memos
	const canUpdate = createMemo(
		() => userStore.get.hasPermission([Permissions.SettingsUpdate]).all,
	);
	const saving = createMemo(
		() => update.action.isPending || typesFetching() > 0,
	);
	const audience = createMemo(() =>
		props.type.audience === "recipients" ? undefined : props.type.audience,
	);
	const roleOptions = createMemo(() =>
		props.roles.map((role) => ({ value: role.id, label: role.name })),
	);
	const selectedRoles = createMemo(() => {
		const roleIds = audience()?.roleIds ?? [];
		return roleOptions().filter((option) => roleIds.includes(option.value));
	});
	const rolesSummary = createMemo(() =>
		selectedRoles().length > 0
			? selectedRoles()
					.map((role) => role.label)
					.join(", ")
			: T()("notifications.settings.roles.placeholder"),
	);

	// ----------------------------------------
	// Functions
	const save = (changes: Partial<Omit<UpdateTypeSettingsParams, "type">>) => {
		update.action.mutate({
			type: props.type.key,
			enabled: props.type.enabled,
			email: props.type.email,
			roleIds: audience()?.roleIds ?? null,
			...changes,
		});
	};

	// ----------------------------------------
	// Render
	return (
		<li data-notification-type-settings class="px-4 py-3">
			<div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div class="min-w-0 grow">
					<h3 class="text-sm text-title">{props.type.name}</h3>
					<Show when={props.type.description}>
						<p class="mt-0.5 text-sm text-muted">{props.type.description}</p>
					</Show>
				</div>
				<div class="flex shrink-0 items-center gap-2">
					<Checkbox
						id={`${props.type.key}-enabled`}
						value={props.type.enabled}
						onChange={(enabled) => save({ enabled })}
						label={T()("notifications.settings.in.app")}
						variant="button"
						disabled={props.type.required || !canUpdate() || saving()}
						tooltip={
							props.type.required
								? T()("notifications.settings.required")
								: undefined
						}
					/>
					<Checkbox
						id={`${props.type.key}-email`}
						value={props.type.email}
						onChange={(email) => save({ email })}
						label={T()("notifications.settings.email")}
						variant="button"
						disabled={!props.type.enabled || !canUpdate() || saving()}
					/>
				</div>
			</div>
			<Show when={audience()}>
				{(audience) => (
					<>
						<button
							type="button"
							class="mt-2 flex max-w-full items-center gap-1.5 text-xs text-muted transition-colors hover:text-body focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary rounded-md"
							aria-expanded={rolesOpen()}
							onClick={() => setRolesOpen((open) => !open)}
						>
							<span class="shrink-0">
								{T()("notifications.settings.roles.label")}:
							</span>
							<span class="min-w-0 truncate text-subtitle">
								{rolesSummary()}
							</span>
							<TbOutlineChevronDown
								size={9}
								class={classnames("shrink-0 transition-transform", {
									"rotate-180": rolesOpen(),
								})}
							/>
						</button>
						<Show when={rolesOpen()}>
							<SelectMultiple
								id={`${props.type.key}-roles`}
								name="roleIds"
								description={T()("notifications.settings.roles.description", {
									permission: audience().permission,
								})}
								placeholder={T()("notifications.settings.roles.placeholder")}
								values={selectedRoles()}
								options={roleOptions()}
								disabled={!props.type.enabled || !canUpdate() || saving()}
								onChange={(values) =>
									save({
										roleIds:
											values.length === 0
												? null
												: values.map((value) => Number(value.value)),
									})
								}
								class="mt-3"
							/>
						</Show>
					</>
				)}
			</Show>
		</li>
	);
};

export default NotificationTypeSettings;
