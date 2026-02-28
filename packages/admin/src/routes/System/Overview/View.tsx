import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import InfoRow from "@/components/Blocks/InfoRow";
import { Standard } from "@/components/Groups/Headers";
import { DynamicContent, Wrapper } from "@/components/Groups/Layout";
import ClearAllProcessedImages from "@/components/Modals/Media/ClearAllProcessedImages";
import DeleteAllShareLinksSystem from "@/components/Modals/Media/DeleteAllShareLinksSystem";
import ClearCache from "@/components/Modals/System/ClearCache";
import Button from "@/components/Partials/Button";
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
	// ----------------------------------------
	// State / Hooks
	const [getOpenClearAllProcessedImages, setOpenClearAllProcessedImages] =
		createSignal(false);
	const [getOpenClearCache, setOpenClearCache] = createSignal(false);
	const [getOpenDeleteAllShareLinks, setOpenDeleteAllShareLinks] =
		createSignal(false);

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
	const percentUsed = createMemo(() => {
		if (settingsData.data?.data?.media?.storage.remaining === null) return 0;
		if (settingsData.data?.data?.media?.storage.used === 0) return 0;
		const total = settingsData.data?.data?.media?.storage.total || 0;
		const remaining = settingsData.data?.data?.media?.storage.remaining || 0;

		return Math.floor(((total - remaining) / total) * 100);
	});
	const contentLocales = createMemo(() => contentLocaleStore.get.locales);
	const systemInfo = createMemo(() => settingsData.data?.data?.system);
	const emailInfo = createMemo(() => settingsData.data?.data?.email);
	const emailFromValue = createMemo(() => {
		const from = emailInfo()?.from;
		return from ? `${from.name} <${from.email}>` : "-";
	});
	const emailTemplates = createMemo(() => emailInfo()?.templates ?? []);
	const canClearCache = createMemo(
		() => userStore.get.hasPermission([Permissions.CacheClear]).all,
	);
	const canDeleteAllShareLinks = createMemo(
		() => userStore.get.hasPermission([Permissions.MediaDelete]).all,
	);
	const canClearAllProcessedImages = createMemo(
		() => userStore.get.hasPermission([Permissions.MediaUpdate]).all,
	);

	// ----------------------------------------
	// Render

	return (
		<Wrapper
			slots={{
				header: (
					<Standard
						copy={{
							title: T()("system_overview_route_title"),
							description: T()("system_overview_route_description"),
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
					<InfoRow.Content
						title={T()("storage_remaining_title", {
							storage: helpers.bytesToSize(
								settingsData.data?.data?.media?.storage.remaining,
							),
						})}
						reducedMargin={true}
					>
						<ProgressBar
							progress={percentUsed()}
							type="usage"
							labels={{
								start: helpers.bytesToSize(
									settingsData.data?.data?.media?.storage.used,
								),
								end: helpers.bytesToSize(
									settingsData.data?.data?.media?.storage.total,
								),
							}}
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
				<InfoRow.Root
					title={T()("maintenance_info_title")}
					description={T()("maintenance_info_description")}
				>
					<InfoRow.Content
						title={T()("clear_all")}
						description={T()("clear_all_processed_images_setting_message")}
						reducedMargin={true}
						theme="danger"
						actions={
							<Button
								size="medium"
								type="button"
								theme="danger-outline"
								onClick={() => {
									setOpenClearAllProcessedImages(true);
								}}
								permission={canClearAllProcessedImages()}
							>
								{T()("clear_all_processed_images_button", {
									count: settingsData.data?.data?.media?.processed.total || 0,
								})}
							</Button>
						}
						actionAlignment="center"
					/>
					<InfoRow.Content
						title={T()("delete_all_share_links_system")}
						description={T()("delete_all_share_links_system_setting_message")}
						reducedMargin={true}
						theme="danger"
						actions={
							<Button
								size="medium"
								type="button"
								theme="danger-outline"
								onClick={() => {
									setOpenDeleteAllShareLinks(true);
								}}
								permission={canDeleteAllShareLinks()}
							>
								{T()("delete_all_share_links_system_button")}
							</Button>
						}
						actionAlignment="center"
					/>
					<InfoRow.Content
						title={T()("clear_cache")}
						description={T()("clear_cache_setting_message")}
						reducedMargin={true}
						theme="danger"
						actions={
							<Button
								size="medium"
								type="button"
								theme="danger-outline"
								onClick={() => {
									setOpenClearCache(true);
								}}
								permission={canClearCache()}
							>
								{T()("clear_cache_button")}
							</Button>
						}
						actionAlignment="center"
					/>
				</InfoRow.Root>
			</DynamicContent>

			{/* Modals */}
			<ClearAllProcessedImages
				state={{
					open: getOpenClearAllProcessedImages(),
					setOpen: setOpenClearAllProcessedImages,
				}}
			/>
			<DeleteAllShareLinksSystem
				state={{
					open: getOpenDeleteAllShareLinks(),
					setOpen: setOpenDeleteAllShareLinks,
				}}
			/>
			<ClearCache
				state={{
					open: getOpenClearCache(),
					setOpen: setOpenClearCache,
				}}
			/>
		</Wrapper>
	);
};

export default SystemOverviewRoute;
