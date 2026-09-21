import { type Component, createMemo } from "solid-js";
import { NavigationTabs } from "@/components/NavigationTabs/NavigationTabs";
import PageLayout from "@/components/PageLayout/PageLayout";
import { Permissions } from "@/constants/permissions";
import siteStore from "@/store/siteStore/siteStore";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";

const SystemSettingsHeader: Component = () => {
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
		<PageLayout.Header
			title={T()("routes.system.settings.title")}
			description={T()("routes.system.settings.description")}
		>
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
						label: T()("routes.system.jobs.title"),
						href: "/lucid/system/jobs",
						permission: canReadJobs(),
					},
				]}
			/>
		</PageLayout.Header>
	);
};

export default SystemSettingsHeader;
