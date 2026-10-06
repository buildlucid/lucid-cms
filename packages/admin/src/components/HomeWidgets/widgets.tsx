import { dashboardSlots } from "virtual:lucid-admin";
import type { Permission } from "@types";
import AdminExtensionBoundary from "@/components/AdminExtensionBoundary/AdminExtensionBoundary";
import { dashboardWidgetSizes } from "@/components/DashboardWidget/constants";
import { Permissions } from "@/constants/permissions";
import siteStore from "@/store/siteStore/siteStore";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import { getAgentAccess } from "@/utils/agent-access";
import helpers from "@/utils/helpers";
import { getReadableCollections } from "@/utils/home-widgets";
import AgentActivityWidget from "./AgentActivityWidget";
import AiCreditsWidget from "./AiCreditsWidget";
import CollectionsWidget from "./CollectionsWidget";
import DocumentRequestsWidget from "./DocumentRequestsWidget";
import PublishingWidget from "./PublishingWidget";
import StorageWidget from "./StorageWidget";
import type { HomeWidget } from "./types";

const can = (permission: Permission) =>
	userStore.get.hasPermission([permission]).all;

//* priorities leave room for plugins to sit between built-ins
const builtInWidgets: HomeWidget[] = [
	{
		key: "lucid.storage",
		priority: 100,
		label: () => T()("home.widget.storage.label"),
		description: () => T()("home.widget.storage.description"),
		size: "sm",
		sizes: ["sm", "md"],
		hidden: false,
		available: () => can(Permissions.SettingsRead),
		component: StorageWidget,
	},
	{
		key: "lucid.aiCredits",
		priority: 90,
		label: () => T()("home.widget.ai.credits.label"),
		description: () => T()("home.widget.ai.credits.description"),
		size: "sm",
		sizes: ["sm", "md"],
		hidden: false,
		//* credits come through the Lucid connection, so they need it live
		available: () =>
			can(Permissions.SettingsRead) &&
			siteStore.get.hasAnyAiFeatureEnabled() &&
			siteStore.get.connection?.status === "connected",
		component: AiCreditsWidget,
	},
	{
		key: "lucid.publishing",
		priority: 80,
		label: () => T()("home.widget.publishing.label"),
		description: () => T()("home.widget.publishing.description"),
		size: "full",
		sizes: ["md", "lg", "full"],
		hidden: false,
		available: (context) =>
			can(Permissions.ReleasesRead) &&
			(context.collections ?? []).some(
				(collection) =>
					collection.publishing.targets.length > 0 &&
					userStore.get.hasPermission([collection.permissions.read]).all,
			),
		component: PublishingWidget,
	},
	{
		key: "lucid.documentRequests",
		priority: 75,
		label: () => T()("home.widget.requests.label"),
		description: () => T()("home.widget.requests.description"),
		size: "md",
		sizes: ["md", "lg", "full"],
		hidden: false,
		available: (context) =>
			can(Permissions.ReleasesRead) &&
			(context.collections ?? []).some(
				(collection) =>
					collection.mode === "multiple" &&
					userStore.get.hasPermission([
						collection.permissions.create,
						collection.permissions["create-request"],
					]).some,
			),
		component: DocumentRequestsWidget,
	},
	{
		key: "lucid.collections",
		priority: 70,
		label: () => T()("home.widget.collections.label"),
		description: () => T()("home.widget.collections.description"),
		size: "full",
		sizes: dashboardWidgetSizes,
		hidden: false,
		available: (context) =>
			getReadableCollections(context.collections ?? []).length > 0,
		component: CollectionsWidget,
	},
	{
		key: "lucid.agentActivity",
		priority: 60,
		label: () => T()("home.widget.agent.label"),
		description: () => T()("home.widget.agent.description"),
		size: "full",
		sizes: dashboardWidgetSizes,
		hidden: false,
		available: () => getAgentAccess().all.length > 0,
		component: AgentActivityWidget,
	},
];

const extensionWidgets = dashboardSlots.map(
	(entry): HomeWidget => ({
		key: entry.key,
		priority: entry.priority ?? 0,
		label: () => helpers.getLocaleValue({ value: entry.card.label }),
		description: () =>
			entry.card.description
				? helpers.getLocaleValue({ value: entry.card.description })
				: undefined,
		size: entry.card.size ?? "md",
		sizes: entry.card.sizes ?? dashboardWidgetSizes,
		hidden: entry.card.hidden ?? false,
		available: () =>
			!entry.permission || userStore.get.meetsRequirement(entry.permission),
		component: (props) => (
			<AdminExtensionBoundary name={entry.key} placement="content">
				<entry.component
					slot="dashboard.widget"
					key={entry.key}
					size={props.size}
					options={entry.options}
				/>
			</AdminExtensionBoundary>
		),
	}),
);

/** Every widget in default order. Higher priorities come first and ties keep registration order. */
export const homeWidgets = [...builtInWidgets, ...extensionWidgets].toSorted(
	(a, b) => b.priority - a.priority,
);
