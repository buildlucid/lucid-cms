import { type Component, createMemo } from "solid-js";
import {
	Standard,
	type StandardHeaderActions,
} from "@/components/Groups/Headers/Standard";
import { NavigationTabs } from "@/components/Groups/Layout";
import { Permissions } from "@/constants/permissions";
import userStore from "@/store/userStore";
import T from "@/translations";

const SystemSettingsHeader: Component<{
	actions?: StandardHeaderActions;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const canReadSettings = createMemo(
		() => userStore.get.hasPermission([Permissions.SettingsRead]).all,
	);
	const canReadClientIntegrations = createMemo(
		() => userStore.get.hasPermission([Permissions.IntegrationsRead]).all,
	);
	const canReadJobs = createMemo(
		() => userStore.get.hasPermission([Permissions.JobsRead]).all,
	);
	const canManageLicense = createMemo(
		() => userStore.get.hasPermission([Permissions.LicenseUpdate]).all,
	);

	// ----------------------------------------
	// Render
	return (
		<Standard
			copy={{
				title: T()("routes.system.settings.title"),
				description: T()("routes.system.settings.description"),
			}}
			actions={props.actions}
			slots={{
				bottom: (
					<NavigationTabs
						tabs={[
							{
								label: T()("common.overview"),
								href: "/lucid/system/overview",
								permission: canReadSettings(),
							},
							{
								label: T()("common.operations"),
								href: "/lucid/system/operations",
								permission: canReadSettings(),
							},
							{
								label: T()("routes.system.client.integrations.title"),
								href: "/lucid/system/integrations",
								permission: canReadClientIntegrations(),
							},
							{
								label: T()("common.queue"),
								href: "/lucid/system/queue-observability",
								permission: canReadJobs(),
							},
							{
								label: T()("common.ai.usage"),
								href: "/lucid/system/ai-usage",
								permission: canReadSettings(),
							},
							{
								label: T()("common.license"),
								href: "/lucid/system/license",
								permission: canManageLicense(),
							},
						]}
					/>
				),
			}}
		/>
	);
};

export default SystemSettingsHeader;
