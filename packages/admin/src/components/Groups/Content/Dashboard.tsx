import { type Component, createMemo, For, Show } from "solid-js";
import Alert from "@/components/Blocks/Alert";
import StartingPoints from "@/components/Blocks/StartingPoints";
import { DynamicContent } from "@/components/Groups/Layout";
import Link from "@/components/Partials/Link";
import constants from "@/constants";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import siteStore from "@/store/siteStore";
import userStore from "@/store/userStore";
import T from "@/translations";

export const Dashboard: Component = () => {
	// ----------------------------------------
	// Queries / Mutations
	const settings = api.settings.useGetSettings({
		queryParams: {
			include: {
				media: true,
			},
		},
	});

	// ----------------------------------------
	// Local
	const docsLinks: Array<{ label: string; href: string }> = [
		{
			label: T()("help.configuring.lucid.cms.title"),
			href: `${constants.documentationUrl}/configuration/configuring-lucid-cms/`,
		},
		{
			label: T()("builder.collections.title"),
			href: `${constants.documentationUrl}/configuration/collection-builder/`,
		},
		{
			label: T()("builder.bricks.title"),
			href: `${constants.documentationUrl}/configuration/brick-builder/`,
		},
		{
			label: T()("common.fetching.data"),
			href: `${constants.documentationUrl}/fetching-data/rest-api/`,
		},
		{
			label: T()("common.hooks"),
			href: `${constants.documentationUrl}/extending-lucid/hooks/`,
		},
		{
			label: T()("common.plugins"),
			href: `${constants.documentationUrl}/extending-lucid/plugins/`,
		},
	];
	const canReadSystemOverview = createMemo(
		() => userStore.get.hasPermission([Permissions.SettingsRead]).all,
	);
	const canReadCollections = createMemo(
		() => userStore.get.hasPermission([Permissions.DocumentsRead]).all,
	);
	const canReadMedia = createMemo(
		() => userStore.get.hasPermission([Permissions.MediaRead]).all,
	);
	const canReadEmails = createMemo(
		() => userStore.get.hasPermission([Permissions.EmailRead]).all,
	);
	const canReadUsers = createMemo(
		() => userStore.get.hasPermission([Permissions.UsersRead]).all,
	);
	const canReadRoles = createMemo(
		() => userStore.get.hasPermission([Permissions.RolesRead]).all,
	);
	const canManageLicense = createMemo(
		() => userStore.get.hasPermission([Permissions.LicenseUpdate]).all,
	);
	const showLicenseBanner = createMemo(
		() => siteStore.get.license?.valid === false,
	);

	// ----------------------------------------
	// Render
	return (
		<DynamicContent
			options={{
				padding: "24",
			}}
		>
			<Show when={showLicenseBanner()}>
				<section class="mb-4 flex flex-col gap-3 rounded-md border border-warning-base/20 bg-warning-base/10 p-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 class="text-sm font-medium text-title">
							{T()("license.dashboard.banner.title")}
						</h2>
						<p class="mt-1 text-sm text-body">
							{T()("license.dashboard.banner.description")}
						</p>
					</div>
					<Show when={canManageLicense()}>
						<Link theme="secondary" size="medium" href="/lucid/system/license">
							{T()("license.dashboard.banner.action")}
						</Link>
					</Show>
				</section>
			</Show>
			<Alert
				style="block"
				alerts={[
					{
						type: "warning",
						message: T()("media.storage.strategy.missing.message"),
						show: settings.data?.data?.media?.enabled === false,
					},
				]}
			/>
			<div class="flex flex-col lg:flex-row lg:items-start gap-6">
				<div class="flex-1">
					<StartingPoints
						links={[
							{
								title: T()("dashboard.starting.points.collections.title"),
								description: T()(
									"dashboard.starting.points.collections.description",
								),
								href: "/lucid/collections",
								icon: "collection",
								permission: canReadCollections(),
							},
							{
								title: T()("dashboard.starting.points.media.title"),
								description: T()("dashboard.starting.points.media.description"),
								href: "/lucid/media",
								icon: "media",
								permission: canReadMedia(),
							},
							{
								title: T()("dashboard.starting.points.emails.title"),
								description: T()(
									"dashboard.starting.points.emails.description",
								),
								href: "/lucid/emails",
								icon: "email",
								permission: canReadEmails(),
							},
							{
								title: T()("dashboard.starting.points.users.title"),
								description: T()("dashboard.starting.points.users.description"),
								href: "/lucid/users",
								icon: "users",
								permission: canReadUsers(),
							},
							{
								title: T()("dashboard.starting.points.roles.title"),
								description: T()("dashboard.starting.points.roles.description"),
								href: "/lucid/roles",
								icon: "roles",
								permission: canReadRoles(),
							},
							{
								title: T()("dashboard.starting.points.settings.title"),
								description: T()(
									"dashboard.starting.points.settings.description",
								),
								href: "/lucid/system",
								icon: "settings",
								permission: canReadSystemOverview(),
							},
						]}
					/>
				</div>
				<aside class="w-full lg:max-w-[260px] lg:sticky lg:top-4 self-start">
					<h2 class="mb-4">{T()("common.documentation")}</h2>
					<ul>
						<For each={docsLinks}>
							{(link) => (
								<li>
									<a
										href={link.href}
										target="_blank"
										rel="noopener noreferrer"
										class="first:border-t px-2 group flex items-center justify-between text-sm text-title hover:text-primary-hover border-b border-border py-4"
									>
										<span>{link.label}</span>
										<span
											aria-hidden="true"
											class="transition-transform group-hover:translate-x-0.5"
										>
											&rarr;
										</span>
									</a>
								</li>
							)}
						</For>
					</ul>
				</aside>
			</div>
		</DynamicContent>
	);
};
