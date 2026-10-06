import { routes as extensionRoutes } from "virtual:lucid-admin";
import packageJson from "@lucidcms/admin/package.json" with { type: "json" };
import { useLocation } from "@solidjs/router";
import type { Permission } from "@types";
import classNames from "classnames";
import { type Component, createMemo, For, Match, Show, Switch } from "solid-js";
import CollectionNavLink, {
	getCollectionNavigationHref,
} from "@/components/CollectionNavLink/CollectionNavLink";
import { NavigationLink } from "@/components/NavigationLink/NavigationLink";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import siteStore from "@/store/siteStore/siteStore";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import { getAgentAccess } from "@/utils/agent-access";
import helpers from "@/utils/helpers";
import { getHomeView } from "@/utils/home-view";
import { isNavigationLinkActive } from "@/utils/navigation";
import {
	getNavigationGroups,
	type NavigationGroup,
} from "../navigation-groups";
import NavigationAccountMenu from "./NavigationAccountMenu";
import { NavigationSection } from "./NavigationSection";

/**
 * The scrollable link list and pinned account footer shared by the desktop
 * sidebar and the mobile drawer. Visibility follows the user's permissions.
 */
export const NavigationMenuContent: Component<{
	class?: string;
	onNavigate?: () => void;
}> = (props) => {
	// ----------------------------------
	// State & Hooks
	const location = useLocation();
	const logout = api.auth.useLogout();
	const collections = api.collections.useGetAll({
		queryParams: {},
	});

	// ----------------------------------
	// Functions
	const can = (permission: Permission) =>
		userStore.get.hasPermission([permission]).all;
	const isActive = (href: string, exact?: boolean) =>
		isNavigationLinkActive(location.pathname, href, exact);
	const getGroupName = (group: NavigationGroup) =>
		group.label ? helpers.getLocaleValue({ value: group.label }) : "";

	// ----------------------------------
	// Memos
	const permissions = createMemo(() => {
		const settings = can(Permissions.SettingsRead);

		return {
			media: can(Permissions.MediaRead),
			emails: can(Permissions.EmailRead),
			users: can(Permissions.UsersRead),
			roles: can(Permissions.RolesRead),
			jobs: can(Permissions.JobsRead),
			systemOverview: settings,
			integrations:
				can(Permissions.IntegrationsRead) || can(Permissions.ConnectionUpdate),
			aiUsage: settings && siteStore.get.hasAnyAiFeatureEnabled(),
			agent: getAgentAccess().all.length > 0,
			requests: can(Permissions.RequestsRead),
		};
	});
	const visibleCollections = createMemo(() => {
		const collectionList = collections.data?.data ?? [];
		return [
			...collectionList.filter((collection) => collection.mode === "multiple"),
			...collectionList.filter(
				(collection) =>
					collection.mode === "single" &&
					userStore.get.hasPermission([
						collection.permissions.read,
						collection.documentId
							? collection.permissions.update
							: collection.permissions.create,
					]).all,
			),
		];
	});
	const ungroupedCollections = createMemo(() =>
		visibleCollections().filter((collection) => !collection.group),
	);
	const showFallbackCollections = createMemo(
		() =>
			collections.isLoading ||
			collections.isError ||
			ungroupedCollections().length > 0,
	);
	const navigationGroups = createMemo(() =>
		getNavigationGroups({
			collections: collections.isSuccess ? visibleCollections() : [],
			routes: extensionRoutes.filter(
				(route) =>
					route.access === "public" ||
					!route.permission ||
					userStore.get.meetsRequirement(route.permission),
			),
			extensionsLabel: T()("common.extensions"),
		}),
	);
	//* an open chat belongs to Chat, not History
	const chatActive = createMemo(() => isActive("/lucid/agent/chats"));

	// ----------------------------------
	// Render
	return (
		<div class={classNames("flex min-h-0 flex-1 flex-col", props.class)}>
			<div class="relative flex min-h-0 flex-1 flex-col">
				<nav class="min-h-0 flex-1 overflow-y-auto scrollbar px-4 pt-4 pb-6">
					<ul>
						<NavigationLink
							href="/lucid"
							icon="dashboard"
							title={T()("common.home")}
						/>
						<NavigationLink
							href="/lucid/media"
							icon="media"
							title={T()("media.library.title")}
							permission={permissions().media}
						/>
						<NavigationLink
							href="/lucid/emails"
							icon="email"
							title={T()("email.activity")}
							permission={permissions().emails}
						/>
					</ul>

					<Show when={permissions().agent}>
						<NavigationSection
							id="lucid:agent"
							title={T()("routes.agent.title")}
							active={isActive("/lucid/agent")}
						>
							<Show
								when={
									getHomeView() !== "ask" && getAgentAccess().chat.length > 0
								}
							>
								<NavigationLink
									href="/lucid/agent"
									exact={true}
									active={chatActive()}
									icon="chat"
									title={T()("routes.agent.chat")}
								/>
							</Show>
							<NavigationLink
								href="/lucid/agent/history"
								icon="history"
								title={T()("routes.agent.history")}
							/>
							<NavigationLink
								href="/lucid/agent/routines"
								permission={
									getAgentAccess().ownRoutines.length > 0 ||
									getAgentAccess().codeRoutines.length > 0
								}
								icon="routines"
								title={T()("routes.agent.routines")}
							/>
						</NavigationSection>
					</Show>

					<Show when={permissions().requests}>
						<NavigationSection
							id="lucid:review"
							title={T()("routes.review.title")}
							active={isActive("/lucid/review") || isActive("/lucid/requests")}
						>
							<NavigationLink
								href="/lucid/review"
								exact={true}
								icon="publishing"
								title={T()("common.overview")}
							/>
							<NavigationLink
								href="/lucid/requests"
								icon="requests"
								title={T()("requests.title")}
							/>
						</NavigationSection>
					</Show>

					{/* Collection and extension groups */}
					<For each={navigationGroups()}>
						{(group) => (
							<NavigationSection
								id={group.key}
								title={getGroupName(group) || group.key}
								capitalize={!getGroupName(group)}
								active={group.items.some((item) =>
									isActive(
										item.kind === "collection"
											? getCollectionNavigationHref(item.collection)
											: item.path,
									),
								)}
							>
								<For each={group.items}>
									{(item) =>
										item.kind === "collection" ? (
											<CollectionNavLink collection={item.collection} />
										) : (
											<NavigationLink
												href={item.path}
												icon={item.navigation.icon ?? "extensions"}
												title={helpers.getLocaleValue({
													value: item.navigation.label,
												})}
											/>
										)
									}
								</For>
							</NavigationSection>
						)}
					</For>

					<Show when={showFallbackCollections()}>
						<NavigationSection
							id="lucid:collections"
							title={T()("common.collections")}
							active={ungroupedCollections().some((collection) =>
								isActive(getCollectionNavigationHref(collection)),
							)}
						>
							<Switch>
								<Match when={collections.isLoading}>
									<li class="skeleton block h-8 w-full mb-0.5" />
									<li class="skeleton block h-8 w-full mb-0.5" />
									<li class="skeleton block h-8 w-full" />
								</Match>
								<Match when={collections.isError}>
									<li class="bg-background rounded-md p-2">
										<p class="text-xs text-center">
											{T()("errors.collections.load.failed")}
										</p>
									</li>
								</Match>
								<Match when={true}>
									<For each={ungroupedCollections()}>
										{(collection) => (
											<CollectionNavLink collection={collection} />
										)}
									</For>
								</Match>
							</Switch>
						</NavigationSection>
					</Show>

					<Show when={permissions().users || permissions().roles}>
						<NavigationSection
							id="lucid:access"
							title={T()("permissions.groups.access.and")}
							active={isActive("/lucid/users") || isActive("/lucid/roles")}
						>
							<NavigationLink
								href="/lucid/users"
								icon="users"
								title={T()("users.accounts")}
								permission={permissions().users}
							/>
							<NavigationLink
								href="/lucid/roles"
								icon="roles"
								title={T()("roles.management")}
								permission={permissions().roles}
							/>
						</NavigationSection>
					</Show>

					<Show
						when={
							permissions().systemOverview ||
							permissions().integrations ||
							permissions().jobs ||
							permissions().aiUsage
						}
					>
						<NavigationSection
							id="lucid:system"
							title={T()("common.system")}
							active={isActive("/lucid/system")}
						>
							<NavigationLink
								href="/lucid/system/overview"
								icon="overview"
								title={T()("common.overview")}
								permission={permissions().systemOverview}
							/>
							<NavigationLink
								href="/lucid/system/operations"
								icon="settings"
								title={T()("common.operations")}
								permission={permissions().systemOverview}
							/>
							<NavigationLink
								href="/lucid/system/integrations"
								icon="integrations"
								title={T()("routes.system.integrations.title")}
								permission={permissions().integrations}
							/>
							<NavigationLink
								href="/lucid/system/ai-usage"
								icon="usage"
								title={T()("common.ai.usage")}
								permission={permissions().aiUsage}
							/>
							<NavigationLink
								href="/lucid/system/jobs"
								icon="queue"
								title={T()("routes.system.jobs.title")}
								permission={permissions().jobs}
							/>
						</NavigationSection>
					</Show>
				</nav>
				{/* Fades links into the pinned logo and account areas as they scroll */}
				<div
					aria-hidden="true"
					class="pointer-events-none absolute inset-x-0 -top-px h-4 bg-linear-to-b from-sidebar to-transparent"
				/>
				<div
					aria-hidden="true"
					class="pointer-events-none absolute inset-x-0 -bottom-px h-6 bg-linear-to-t from-sidebar to-transparent"
				/>
			</div>

			<div class="px-4 pt-3 pb-4">
				<Show when={userStore.get.user}>
					{(user) => (
						<NavigationAccountMenu
							user={user()}
							logoutPending={logout.action.isPending}
							onLogout={() => logout.action.mutate({})}
							onNavigate={props.onNavigate}
						/>
					)}
				</Show>
				<div class="mt-2 flex justify-center">
					<small class="px-2 py-1 text-center text-[10px] leading-none text-muted">
						v{packageJson.version}
					</small>
				</div>
			</div>
		</div>
	);
};
