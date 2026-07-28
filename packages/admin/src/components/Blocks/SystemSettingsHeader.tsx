import { type Component, createMemo } from "solid-js";
import {
	Standard,
	type StandardHeaderActions,
} from "@/components/Groups/Headers/Standard";
import { NavigationTabs } from "@/components/Groups/Layout";
import { Permissions } from "@/constants/permissions";
import siteStore from "@/store/siteStore";
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
	const canReadIntegrations = createMemo(
		() => userStore.get.hasPermission([Permissions.IntegrationsRead]).all,
	);
	const canReadJobs = createMemo(
		() => userStore.get.hasPermission([Permissions.JobsRead]).all,
	);
	const canManageConnection = createMemo(
		() => userStore.get.hasPermission([Permissions.ConnectionUpdate]).all,
	);
	const canReadAiUsage = createMemo(
		() => canReadSettings() && siteStore.get.hasAnyAiFeatureEnabled(),
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
								label: T()("routes.system.integrations.title"),
								href: "/lucid/system/integrations",
								permission: canReadIntegrations() || canManageConnection(),
							},
							{
								label: T()("common.ai.usage"),
								href: "/lucid/system/ai-usage",
								permission: canReadAiUsage(),
							},
							{
								label: T()("common.queue"),
								href: "/lucid/system/queue-observability",
								permission: canReadJobs(),
							},
						]}
					/>
				),
			}}
		/>
	);
};

export default SystemSettingsHeader;
