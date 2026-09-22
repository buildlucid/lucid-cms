import { type Component, createMemo } from "solid-js";
import PageLayout from "@/components/PageLayout/PageLayout";
import Tabs from "@/components/Tabs/Tabs";
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
			<Tabs.Nav
				class="hidden px-4 pb-4 md:px-6 lg:block"
				tabs={[
					{
						label: T()("common.overview"),
						href: "/lucid/system/overview",
						show: canReadSettings(),
					},
					{
						label: T()("common.operations"),
						href: "/lucid/system/operations",
						show: canReadSettings(),
					},
					{
						label: T()("routes.system.integrations.title"),
						href: "/lucid/system/integrations",
						show: canReadIntegrations() || canManageConnection(),
					},
					{
						label: T()("common.ai.usage"),
						href: "/lucid/system/ai-usage",
						show: canReadAiUsage(),
					},
					{
						label: T()("routes.system.jobs.title"),
						href: "/lucid/system/jobs",
						show: canReadJobs(),
					},
				]}
			/>
		</PageLayout.Header>
	);
};

export default SystemSettingsHeader;
