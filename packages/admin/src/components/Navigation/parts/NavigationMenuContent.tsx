import { routes as extensionRoutes } from "virtual:lucid-admin";
import packageJson from "@lucidcms/admin/package.json" with { type: "json" };
import type { Collection, User } from "@types";
import classNames from "classnames";
import { type Component, createMemo, For, Match, Show, Switch } from "solid-js";
import CollectionNavLink from "@/components/CollectionNavLink/CollectionNavLink";
import { NavigationLink } from "@/components/NavigationLink/NavigationLink";
import T from "@/translations";
import helpers from "@/utils/helpers";
import {
	getNavigationGroups,
	type NavigationGroup,
} from "../navigation-groups";
import NavigationAccountMenu from "./NavigationAccountMenu";

export type NavigationMenuContentProps = {
	class?: string;
	onNavigate?: () => void;
	logoutPending?: boolean;
	onLogout?: () => void;
	user?: Pick<User, "username" | "firstName" | "lastName" | "profilePicture">;
	canReadDocuments: boolean;
	canReadPublishingOverview: boolean;
	canReadPublishRequests: boolean;
	canReadMedia: boolean;
	canReadEmails: boolean;
	canReadUsers: boolean;
	canReadRoles: boolean;
	canReadJobs: boolean;
	canReadAiUsage: boolean;
	canManageConnection: boolean;
	canReadIntegrations: boolean;
	canReadSystemOverview: boolean;
	showAccessAndPermissions: boolean;
	collectionsIsLoading: boolean;
	collectionsIsError: boolean;
	multiCollections: Collection[];
	singleCollections: Collection[];
};

export const NavigationMenuContent: Component<NavigationMenuContentProps> = (
	props,
) => {
	// ----------------------------------
	// Functions
	const handleNavigate = () => {
		props.onNavigate?.();
	};

	// ----------------------------------
	// Memos
	const showSystemSection = createMemo(
		() =>
			props.canReadSystemOverview ||
			props.canReadIntegrations ||
			props.canManageConnection ||
			props.canReadJobs ||
			props.canReadAiUsage,
	);
	const showPublishingSection = createMemo(
		() => props.canReadPublishingOverview || props.canReadPublishRequests,
	);
	const orderedCollections = createMemo(() => [
		...props.multiCollections,
		...props.singleCollections,
	]);
	const ungroupedCollections = createMemo(() =>
		orderedCollections().filter((collection) => !collection.group),
	);
	const showFallbackCollections = createMemo(
		() =>
			props.collectionsIsLoading ||
			props.collectionsIsError ||
			ungroupedCollections().length > 0,
	);
	const navigationGroups = createMemo(() =>
		getNavigationGroups({
			collections:
				props.canReadDocuments &&
				!props.collectionsIsLoading &&
				!props.collectionsIsError
					? orderedCollections()
					: [],
			routes: extensionRoutes,
			extensionsLabel: T()("common.extensions"),
		}),
	);
	const getGroupName = (group: NavigationGroup) => {
		if (!group.label) return "";

		return helpers.getLocaleValue({
			value: group.label,
		});
	};
	const getGroupTitle = (group: NavigationGroup) => {
		return getGroupName(group) || group.key;
	};
	const groupUsesFallbackTitle = (group: NavigationGroup) => {
		return getGroupName(group).length === 0;
	};

	// ----------------------------------
	// Render
	return (
		<div
			class={classNames("h-full flex justify-between flex-col", props.class)}
		>
			<div class="pt-4 lg:pt-6 px-4">
				<ul class="pb-6">
					<NavigationLink
						type="link"
						href="/lucid"
						icon="dashboard"
						title={T()("common.dashboard")}
					/>
					<NavigationLink
						type="link"
						href="/lucid/media"
						icon="media"
						title={T()("media.library.title")}
						permission={props.canReadMedia}
					/>
					<NavigationLink
						type="link"
						href="/lucid/emails"
						icon="email"
						title={T()("email.activity")}
						permission={props.canReadEmails}
					/>

					{/* Publishing */}
					<Show when={showPublishingSection()}>
						<div class="w-full mt-4 mb-2">
							<span class="text-xs">{T()("common.publishing")}</span>
						</div>
					</Show>
					<NavigationLink
						type="link"
						href="/lucid/publishing"
						exact={true}
						icon="publishing"
						title={T()("common.overview")}
						permission={props.canReadPublishingOverview}
					/>
					<NavigationLink
						type="link"
						href="/lucid/publishing/requests"
						icon="release-requests"
						title={T()("publish.requests.list.title")}
						permission={props.canReadPublishRequests}
					/>

					{/* Collection and extension groups */}
					<For each={navigationGroups()}>
						{(group) => (
							<>
								<div class="w-full mt-4 mb-2">
									<span
										class={classNames("text-xs", {
											capitalize: groupUsesFallbackTitle(group),
										})}
									>
										{getGroupTitle(group)}
									</span>
								</div>
								<For each={group.items}>
									{(item) =>
										item.kind === "collection" ? (
											<CollectionNavLink collection={item.collection} />
										) : (
											<NavigationLink
												type="link"
												href={item.path}
												icon={item.navigation.icon ?? "extensions"}
												title={helpers.getLocaleValue({
													value: item.navigation.label,
												})}
											/>
										)
									}
								</For>
							</>
						)}
					</For>
					<Show when={props.canReadDocuments}>
						<Show when={showFallbackCollections()}>
							<div class="w-full mt-4 mb-2">
								<span class="text-xs">{T()("common.collections")}</span>
							</div>
							<Switch>
								<Match when={props.collectionsIsLoading}>
									<span class="skeleton block h-8 w-full mb-1" />
									<span class="skeleton block h-8 w-full mb-1" />
									<span class="skeleton block h-8 w-full mb-1" />
								</Match>
								<Match when={props.collectionsIsError}>
									<div class="bg-background-base rounded-md p-2">
										<p class="text-xs text-center">
											{T()("errors.collections.load.failed")}
										</p>
									</div>
								</Match>
								<Match when={true}>
									<For each={ungroupedCollections()}>
										{(collection) => (
											<CollectionNavLink collection={collection} />
										)}
									</For>
								</Match>
							</Switch>
						</Show>
					</Show>

					{/* Access & Permissions */}
					<Show when={props.showAccessAndPermissions}>
						<div class="w-full mt-4 mb-2">
							<span class="text-xs">
								{T()("permissions.groups.access.and")}
							</span>
						</div>
					</Show>
					<NavigationLink
						type="link"
						href="/lucid/users"
						icon="users"
						title={T()("users.accounts")}
						permission={props.canReadUsers}
					/>
					<NavigationLink
						type="link"
						href="/lucid/roles"
						icon="roles"
						title={T()("roles.management")}
						permission={props.canReadRoles}
					/>

					{/* System */}
					<Show when={showSystemSection()}>
						<div class="w-full mt-4 mb-2">
							<span class="text-xs">{T()("common.system")}</span>
						</div>
					</Show>
					<NavigationLink
						type="link"
						href="/lucid/system/overview"
						icon="overview"
						title={T()("common.overview")}
						permission={props.canReadSystemOverview}
					/>
					<NavigationLink
						type="link"
						href="/lucid/system/operations"
						icon="settings"
						title={T()("common.operations")}
						permission={props.canReadSystemOverview}
					/>
					<NavigationLink
						type="link"
						href="/lucid/system/integrations"
						icon="integrations"
						title={T()("routes.system.integrations.title")}
						permission={props.canReadIntegrations || props.canManageConnection}
					/>
					<NavigationLink
						type="link"
						href="/lucid/system/ai-usage"
						icon="overview"
						title={T()("common.ai.usage")}
						permission={props.canReadAiUsage}
					/>
					<NavigationLink
						type="link"
						href="/lucid/system/jobs"
						icon="queue"
						title={T()("routes.system.jobs.title")}
						permission={props.canReadJobs}
					/>
				</ul>
			</div>
			<div class="px-4 pb-6 pt-8">
				<Show when={props.user?.username}>
					{(username) => (
						<NavigationAccountMenu
							user={{
								username: username(),
								firstName: props.user?.firstName ?? null,
								lastName: props.user?.lastName ?? null,
								profilePicture: props.user?.profilePicture ?? null,
							}}
							logoutPending={props.logoutPending}
							onLogout={props.onLogout}
							onNavigate={handleNavigate}
						/>
					)}
				</Show>
				<div class="mt-3 flex justify-center">
					<small class="px-2 py-1 text-center text-[10px] leading-none text-unfocused">
						v{packageJson.version}
					</small>
				</div>
			</div>
		</div>
	);
};
