import { A } from "@solidjs/router";
import type { CollectionResponse } from "@types";
import classNames from "classnames";
import { type Component, For, Match, Show, Switch } from "solid-js";
import { IconLinkFull } from "@/components/Groups/Navigation";
import UserDisplay from "@/components/Partials/UserDisplay";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getDocumentRoute } from "@/utils/route-helpers";
import packageJson from "../../../../../../packages/core/package.json" with {
	type: "json",
};

export type NavigationMenuContentProps = {
	class?: string;
	showFooterActions?: boolean;
	onNavigate?: () => void;
	logoutPending?: boolean;
	onLogout?: () => void;
	user?: {
		username?: string | null;
		firstName?: string | null;
		lastName?: string | null;
	};
	showLicenseAlert: boolean;
	canReadDocuments: boolean;
	canReadMedia: boolean;
	canReadEmails: boolean;
	canReadUsers: boolean;
	canReadRoles: boolean;
	canReadJobs: boolean;
	canManageLicense: boolean;
	canReadClientIntegrations: boolean;
	showAccessAndPermissions: boolean;
	collectionsIsLoading: boolean;
	collectionsIsError: boolean;
	multiCollections: CollectionResponse[];
	singleCollections: CollectionResponse[];
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
						title={T()("dashboard")}
					/>
					<IconLinkFull
						type="link"
						href="/lucid/media"
						icon="media"
						title={T()("media_library")}
						permission={props.canReadMedia}
					/>
					<IconLinkFull
						type="link"
						href="/lucid/emails"
						icon="email"
						title={T()("email_activity")}
						permission={props.canReadEmails}
					/>

					{/* Collections */}
					<Show when={props.canReadDocuments}>
						<div class="w-full mt-4 mb-2">
							<span class="text-xs">{T()("collections")}</span>
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
										{T()("error_loading_collections")}
									</p>
								</div>
							</Match>
							<Match when={true}>
								<For each={props.multiCollections}>
									{(collection) => (
										<IconLinkFull
											type="link"
											href={`/lucid/collections/${collection.key}`}
											icon="collection-multiple"
											title={helpers.getLocaleValue({
												value: collection.details.name,
											})}
										/>
									)}
								</For>
								<For each={props.singleCollections}>
									{(collection) => (
										<IconLinkFull
											type="link"
											href={
												collection.documentId
													? getDocumentRoute("edit", {
															collectionKey: collection.key,
															documentId: collection.documentId,
														})
													: getDocumentRoute("create", {
															collectionKey: collection.key,
														})
											}
											icon="collection-single"
											title={helpers.getLocaleValue({
												value: collection.details.name,
											})}
										/>
									)}
								</For>
							</Match>
						</Switch>
					</Show>

					{/* Access & Permissions */}
					<Show when={props.showAccessAndPermissions}>
						<div class="w-full mt-4 mb-2">
							<span class="text-xs">{T()("access_and_permissions")}</span>
						</div>
					</Show>
					<IconLinkFull
						type="link"
						href="/lucid/users"
						icon="users"
						title={T()("user_accounts")}
						permission={props.canReadUsers}
					/>
					<IconLinkFull
						type="link"
						href="/lucid/roles"
						icon="roles"
						title={T()("role_management")}
						permission={props.canReadRoles}
					/>

					{/* System */}
					<div class="w-full mt-4 mb-2">
						<span class="text-xs">{T()("system")}</span>
					</div>
					<IconLinkFull
						type="link"
						href="/lucid/system/overview"
						icon="overview"
						title={T()("overview")}
					/>
					<IconLinkFull
						type="link"
						href="/lucid/system/integrations"
						icon="client-integrations"
						title={T()("client_integrations")}
						permission={props.canReadClientIntegrations}
					/>
					<IconLinkFull
						type="link"
						href="/lucid/system/license"
						icon="license"
						title={T()("manage_license")}
						permission={props.canManageLicense}
					/>
					<IconLinkFull
						type="link"
						href="/lucid/system/queue-observability"
						icon="queue"
						title={T()("queue_observability")}
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
							title={T()("logout")}
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
											thumbnail: undefined,
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
						<div class="bg-warning-base/10 border border-warning-base/20 rounded-md px-2 py-2 text-center">
							<p class="text-xs">{T()("license_invalid_message")}</p>
						</div>
					</Show>
					<small class="text-xs leading-none bg-background-base rounded-md px-2 py-2 block text-center">
						v{packageJson.version}
					</small>
				</div>
			</div>
		</div>
	);
};
