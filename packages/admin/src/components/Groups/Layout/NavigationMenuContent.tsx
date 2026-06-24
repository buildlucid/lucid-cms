import { A } from "@solidjs/router";
import type { Collection, User } from "@types";
import classNames from "classnames";
import { FaSolidKey } from "solid-icons/fa";
import { type Component, createMemo, For, Match, Show, Switch } from "solid-js";
import { IconLinkFull } from "@/components/Groups/Navigation";
import CollectionNavLink from "@/components/Partials/CollectionNavLink";
import UserDisplay from "@/components/Partials/UserDisplay";
import T from "@/translations";
import helpers from "@/utils/helpers";
import packageJson from "../../../../../../packages/core/package.json" with {
	type: "json",
};

export type NavigationMenuContentProps = {
	class?: string;
	showFooterActions?: boolean;
	onNavigate?: () => void;
	logoutPending?: boolean;
	onLogout?: () => void;
	user?: Pick<User, "username" | "firstName" | "lastName" | "profilePicture">;
	showLicenseAlert: boolean;
	canReadDocuments: boolean;
	canReadPublishRequests: boolean;
	canReadMedia: boolean;
	canReadEmails: boolean;
	canReadUsers: boolean;
	canReadRoles: boolean;
	canReadJobs: boolean;
	canReadAiUsage: boolean;
	canManageLicense: boolean;
	canReadClientIntegrations: boolean;
	canReadSystemOverview: boolean;
	showAccessAndPermissions: boolean;
	collectionsIsLoading: boolean;
	collectionsIsError: boolean;
	multiCollections: Collection[];
	singleCollections: Collection[];
};

type CollectionNavGroup = {
	key: string;
	name: NonNullable<Collection["group"]>["name"];
	order: NonNullable<Collection["group"]>["order"];
	collections: Collection[];
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
			props.canReadClientIntegrations ||
			props.canManageLicense ||
			props.canReadJobs ||
			props.canReadAiUsage,
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
	const collectionGroups = createMemo(() => {
		const groups: CollectionNavGroup[] = [];
		const groupsByKey = new Map<string, CollectionNavGroup>();

		for (const collection of orderedCollections()) {
			const group = collection.group;
			if (!group) continue;

			const existingGroup = groupsByKey.get(group.key);
			if (existingGroup) {
				if (!existingGroup.name && group.name) {
					existingGroup.name = group.name;
				}
				if (existingGroup.order === null && group.order !== null) {
					existingGroup.order = group.order;
				}
				existingGroup.collections.push(collection);
				continue;
			}

			const collectionGroup = {
				key: group.key,
				name: group.name,
				order: group.order,
				collections: [collection],
			};
			groups.push(collectionGroup);
			groupsByKey.set(group.key, collectionGroup);
		}

		return [...groups].sort((groupA, groupB) => {
			if (groupA.order === null && groupB.order === null) return 0;
			if (groupA.order === null) return 1;
			if (groupB.order === null) return -1;
			return groupA.order - groupB.order;
		});
	});
	const getGroupName = (group: CollectionNavGroup) => {
		if (!group.name) return "";

		return helpers.getLocaleValue({
			value: group.name,
		});
	};
	const getGroupTitle = (group: CollectionNavGroup) => {
		return getGroupName(group) || group.key;
	};
	const groupUsesFallbackTitle = (group: CollectionNavGroup) => {
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
					<IconLinkFull
						type="link"
						href="/lucid"
						icon="dashboard"
						title={T()("common.dashboard")}
					/>
					<IconLinkFull
						type="link"
						href="/lucid/media"
						icon="media"
						title={T()("media.library.title")}
						permission={props.canReadMedia}
					/>
					<IconLinkFull
						type="link"
						href="/lucid/emails"
						icon="email"
						title={T()("email.activity")}
						permission={props.canReadEmails}
					/>
					<IconLinkFull
						type="link"
						href="/lucid/release-requests"
						icon="release-requests"
						title={T()("publish.requests.list.title")}
						permission={props.canReadPublishRequests}
					/>

					{/* Collections */}
					<Show when={props.canReadDocuments}>
						<Show
							when={!props.collectionsIsLoading && !props.collectionsIsError}
						>
							<For each={collectionGroups()}>
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
										<For each={group.collections}>
											{(collection) => (
												<CollectionNavLink collection={collection} />
											)}
										</For>
									</>
								)}
							</For>
						</Show>
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
					<IconLinkFull
						type="link"
						href="/lucid/users"
						icon="users"
						title={T()("users.accounts")}
						permission={props.canReadUsers}
					/>
					<IconLinkFull
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
					<IconLinkFull
						type="link"
						href="/lucid/system/overview"
						icon="overview"
						title={T()("common.overview")}
						permission={props.canReadSystemOverview}
					/>
					<IconLinkFull
						type="link"
						href="/lucid/system/operations"
						icon="settings"
						title={T()("common.operations")}
						permission={props.canReadSystemOverview}
					/>
					<IconLinkFull
						type="link"
						href="/lucid/system/integrations"
						icon="client-integrations"
						title={T()("routes.system.client.integrations.title")}
						permission={props.canReadClientIntegrations}
					/>
					<IconLinkFull
						type="link"
						href="/lucid/system/ai-usage"
						icon="overview"
						title={T()("common.ai.usage")}
						permission={props.canReadAiUsage}
					/>
					<IconLinkFull
						type="link"
						href="/lucid/system/license"
						icon="license"
						title={T()("common.license")}
						permission={props.canManageLicense}
					/>
					<IconLinkFull
						type="link"
						href="/lucid/system/queue-observability"
						icon="queue"
						title={T()("queue.observability")}
						permission={props.canReadJobs}
					/>
				</ul>
			</div>
			<div class="pb-6 px-4">
				<Show when={props.showFooterActions !== false}>
					<ul class="flex flex-col border-t border-border pt-6">
						<IconLinkFull
							type="button"
							icon="logout"
							loading={props.logoutPending}
							onClick={props.onLogout}
							title={T()("common.logout")}
						/>
						<Show when={props.user?.username}>
							<li>
								<A
									href="/lucid/account"
									class="flex items-center justify-center mt-6"
									onClick={handleNavigate}
								>
									<UserDisplay
										user={{
											username: props.user?.username || "",
											firstName: props.user?.firstName,
											lastName: props.user?.lastName,
											profilePicture: props.user?.profilePicture,
										}}
										mode="long"
									/>
								</A>
							</li>
						</Show>
					</ul>
				</Show>
				<div
					class={classNames("mt-4 flex flex-col gap-2", {
						"border-t border-border pt-4": props.showFooterActions === false,
					})}
				>
					<Show when={props.showLicenseAlert}>
						<Show
							when={props.canManageLicense}
							fallback={
								<div class="flex w-full min-w-0 items-start gap-1 rounded-md border border-warning-base/20 bg-warning-base/10 px-2 py-1.5">
									<span class="flex size-5 shrink-0 items-center justify-center rounded-md text-icon-base">
										<FaSolidKey class="size-3" />
									</span>
									<span class="flex min-w-0 flex-col">
										<span class="text-xs font-medium leading-4 text-title">
											{T()("license.banner.nav.title")}
										</span>
										<span class="text-[11px] leading-4 text-body">
											{T()("license.banner.nav.status")}
										</span>
									</span>
								</div>
							}
						>
							<A
								href="/lucid/system/license"
								class="flex w-full min-w-0 items-start gap-1 rounded-md border border-warning-base/20 bg-warning-base/10 px-2 py-1.5 text-left transition-colors hover:bg-warning-base/10 focus:outline-none focus-visible:ring-1 ring-primary-base"
								onClick={handleNavigate}
							>
								<span class="flex size-5 shrink-0 items-center justify-center rounded-md text-icon-base">
									<FaSolidKey class="size-3" />
								</span>
								<span class="flex min-w-0 flex-col">
									<span class="text-xs font-medium leading-4 text-title">
										{T()("license.banner.nav.title")}
									</span>
									<span class="text-[11px] leading-4 text-body">
										{T()("license.banner.nav.status")}
									</span>
								</span>
							</A>
						</Show>
					</Show>
					<small class="text-xs leading-none bg-background-base rounded-md px-2 py-2 block text-center">
						v{packageJson.version}
					</small>
				</div>
			</div>
		</div>
	);
};
