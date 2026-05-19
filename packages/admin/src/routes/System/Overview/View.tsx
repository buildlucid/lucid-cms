import { type Component, createMemo, For, Show } from "solid-js";
import InfoRow from "@/components/Blocks/InfoRow";
import { Standard } from "@/components/Groups/Headers";
import {
	DynamicContent,
	NavigationTabs,
	Wrapper,
} from "@/components/Groups/Layout";
import DetailsList from "@/components/Partials/DetailsList";
import Pill from "@/components/Partials/Pill";
import ProgressBar from "@/components/Partials/ProgressBar";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore";
import userStore from "@/store/userStore";
import T from "@/translations";
import helpers from "@/utils/helpers";

const SystemOverviewRoute: Component = () => {
	// ----------------------------------
	// Queries
	const settingsData = api.settings.useGetSettings({
		queryParams: {
			include: {
				email: true,
				media: true,
				system: true,
			},
		},
	});

	// ----------------------------------------
	// Memos
	const storageInfo = createMemo(
		() => settingsData.data?.data?.media?.storage ?? null,
	);
	const isUnlimitedStorage = createMemo(
		() => storageInfo()?.total === null || storageInfo()?.remaining === null,
	);
	const clampedRemainingStorage = createMemo(() =>
		Math.max(0, storageInfo()?.remaining ?? 0),
	);
	const percentUsed = createMemo(() => {
		if (isUnlimitedStorage()) return 100;
		const total = storageInfo()?.total ?? 0;
		const used = storageInfo()?.used ?? 0;
		if (total <= 0 || used <= 0) return 0;

		const rawPercent = (used / total) * 100;
		return Math.max(0, Math.min(100, Math.floor(rawPercent)));
	});
	const storageTitle = createMemo(() => {
		if (isUnlimitedStorage()) return T()("storage_unlimited_title");
		return T()("storage_remaining_title", {
			storage: helpers.bytesToSize(clampedRemainingStorage()),
		});
	});
	const storageBarLabels = createMemo(() => {
		if (isUnlimitedStorage()) {
			return {
				start: helpers.bytesToSize(storageInfo()?.used),
				end: T()("unlimited"),
			};
		}
		return {
			start: helpers.bytesToSize(storageInfo()?.used),
			end: helpers.bytesToSize(storageInfo()?.total),
		};
	});
	const contentLocales = createMemo(() => contentLocaleStore.get.locales);
	const systemInfo = createMemo(() => settingsData.data?.data?.system);
	const emailInfo = createMemo(() => settingsData.data?.data?.email);
	const emailFromValue = createMemo(() => {
		const from = emailInfo()?.from;
		return from ? `${from.name} <${from.email}>` : "-";
	});
	const emailTemplates = createMemo(() => emailInfo()?.templates ?? []);
	const canReadSystemOverview = createMemo(
		() => userStore.get.hasPermission([Permissions.SettingsRead]).all,
	);
	const canReadSystemOperations = createMemo(
		() => userStore.get.hasPermission([Permissions.SettingsRead]).all,
	);
	const canManageLicense = createMemo(
		() => userStore.get.hasPermission([Permissions.LicenseUpdate]).all,
	);

	// ----------------------------------------
	// Render

	return (
		<Wrapper
			slots={{
				header: (
					<Standard
						copy={{
							title: T()("system_settings_route_title"),
							description: T()("system_settings_route_description"),
						}}
						slots={{
							bottom: (
								<NavigationTabs
									tabs={[
										{
											label: T()("overview"),
											href: "/lucid/system/overview",
											permission: canReadSystemOverview(),
										},
										{
											label: T()("operations"),
											href: "/lucid/system/operations",
											permission: canReadSystemOperations(),
										},
										{
											label: T()("license"),
											href: "/lucid/system/license",
											permission: canManageLicense(),
										},
									]}
								/>
							),
						}}
					/>
				),
			}}
		>
			<DynamicContent
				state={{
					isError: settingsData.isError,
					isSuccess: settingsData.isSuccess,
					isLoading: settingsData.isLoading,
				}}
				options={{
					padding: "24",
				}}
			>
				<InfoRow.Root
					title={T()("media_info_title")}
					description={T()("media_info_description")}
				>
					<InfoRow.Content title={storageTitle()} reducedMargin={true}>
						<ProgressBar
							progress={percentUsed()}
							type={isUnlimitedStorage() ? "target" : "usage"}
							labels={storageBarLabels()}
						/>
					</InfoRow.Content>
					<InfoRow.Content
						title={T()("processed_images")}
						description={T()("processed_images_setting_message", {
							limit: settingsData.data?.data?.media?.processed.imageLimit || 0,
						})}
						reducedMargin={true}
					>
						<DetailsList
							type="text"
							theme="contained"
							items={[
								{
									label: T()("stored"),
									value: settingsData.data?.data?.media?.processed.stored
										? T()("yes")
										: T()("no"),
								},
								{
									label: T()("limit"),
									value:
										settingsData.data?.data?.media?.processed.imageLimit ?? 0,
								},
								{
									label: T()("total"),
									value: settingsData.data?.data?.media?.processed.total ?? 0,
								},
							]}
						/>
					</InfoRow.Content>
				</InfoRow.Root>

				<InfoRow.Root
					title={T()("email_info_title")}
					description={T()("email_info_description")}
				>
					<InfoRow.Content
						title={T()("email_delivery_title")}
						reducedMargin={true}
					>
						<DetailsList
							type="text"
							theme="contained"
							items={[
								{
									label: T()("simulated"),
									value:
										emailInfo()?.simulated === true ? T()("yes") : T()("no"),
								},
								{
									label: T()("from"),
									value: emailFromValue(),
								},
							]}
						/>
					</InfoRow.Content>
					<InfoRow.Content
						title={T()("available_templates")}
						reducedMargin={true}
					>
						<Show
							when={emailTemplates().length > 0}
							fallback={
								<p class="text-sm text-unfocused">{T()("no_templates")}</p>
							}
						>
							<div class="flex flex-wrap gap-2">
								<For each={emailTemplates()}>
									{(template) => <Pill theme="outline">{template}</Pill>}
								</For>
							</div>
						</Show>
					</InfoRow.Content>
				</InfoRow.Root>
				<InfoRow.Root
					title={T()("system_info_title")}
					description={T()("system_info_description")}
				>
					<InfoRow.Content
						title={T()("adapters_title")}
						description={T()("adapters_description")}
						reducedMargin={true}
					>
						<DetailsList
							type="text"
							theme="contained"
							items={[
								{
									label: T()("runtime"),
									value: systemInfo()?.runtime ?? "-",
								},
								{
									label: T()("database"),
									value: systemInfo()?.database ?? "-",
								},
								{
									label: T()("kv"),
									value: systemInfo()?.kv ?? "-",
								},
								{
									label: T()("queue"),
									value: systemInfo()?.queue ?? "-",
								},
								{
									label: T()("media"),
									value: systemInfo()?.media ?? "-",
								},
								{
									label: T()("email"),
									value: systemInfo()?.email ?? "-",
								},
								{
									label: T()("image_processor"),
									value: systemInfo()?.imageProcessor ?? "-",
								},
							]}
						/>
					</InfoRow.Content>
					<InfoRow.Content
						title={T()("content_locales")}
						description={T()("content_locales_description")}
						reducedMargin={true}
					>
						<DetailsList
							type="text"
							theme="contained"
							items={
								contentLocales().map((locale) => ({
									label: locale.name || locale.code,
									value: `${locale.code} ${
										locale.isDefault ? `(${T()("default")})` : ""
									} `,
								})) || []
							}
						/>
					</InfoRow.Content>
				</InfoRow.Root>
			</DynamicContent>
		</Wrapper>
	);
};

export default SystemOverviewRoute;
