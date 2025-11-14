import { type Component, createMemo, createSignal, Show } from "solid-js";
import InfoRow from "@/components/Blocks/InfoRow";
import { Standard } from "@/components/Groups/Headers";
import { DynamicContent, Wrapper } from "@/components/Groups/Layout";
import ClearAllProcessedImages from "@/components/Modals/Media/ClearAllProcessedImages";
import DeleteAllShareLinksSystem from "@/components/Modals/Media/DeleteAllShareLinksSystem";
import ClearCache from "@/components/Modals/System/ClearCache";
import Button from "@/components/Partials/Button";
import DetailsList from "@/components/Partials/DetailsList";
import ProgressBar from "@/components/Partials/ProgressBar";
import api from "@/services/api";
import contentLocaleStore from "@/store/contentLocaleStore";
import userStore from "@/store/userStore";
import T from "@/translations";
import helpers from "@/utils/helpers";

const SystemOverviewRoute: Component = (props) => {
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
		queryParams: {},
	});

	// ----------------------------------------
	// Memos
	const percentUsed = createMemo(() => {
		if (settingsData.data?.data?.media.storage.remaining === null) return 0;
		if (settingsData.data?.data?.media.storage.used === 0) return 0;
		const total = settingsData.data?.data?.media.storage.total || 0;
		const remaining = settingsData.data?.data?.media.storage.remaining || 0;

		return Math.floor(((total - remaining) / total) * 100);
	});
	const contentLocales = createMemo(() => contentLocaleStore.get.locales);
	const canClearCache = createMemo(
		() => userStore.get.hasPermission(["clear_kv"]).all,
	);
	const canDeleteAllShareLinks = createMemo(
		() => userStore.get.hasPermission(["delete_media"]).all,
	);
	const canClearAllProcessedImages = createMemo(
		() => userStore.get.hasPermission(["update_media"]).all,
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
				{/* Storage */}
				<InfoRow.Root
					title={T()("storage_breakdown")}
					description={T()("storage_breakdown_setting_message")}
				>
					<InfoRow.Content
						title={T()("storage_remaining_title", {
							storage: helpers.bytesToSize(
								settingsData.data?.data?.media.storage.remaining,
							),
						})}
					>
						<ProgressBar
							progress={percentUsed()}
							type="usage"
							labels={{
								start: helpers.bytesToSize(
									settingsData.data?.data?.media.storage.used,
								),
								end: helpers.bytesToSize(
									settingsData.data?.data?.media.storage.total,
								),
							}}
						/>
					</InfoRow.Content>
				</InfoRow.Root>

				{/* Processed Images */}
				<InfoRow.Root
					title={T()("processed_images")}
					description={T()("processed_images_setting_message", {
						limit: settingsData.data?.data?.media.processed.imageLimit || 0,
					})}
				>
					<InfoRow.Content
						title={T()("clear_all")}
						description={T()("clear_all_processed_images_setting_message")}
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
									count: settingsData.data?.data?.media.processed.total || 0,
								})}
							</Button>
						}
						actionAlignment="center"
					/>
				</InfoRow.Root>

				{/* Share Links */}
				<InfoRow.Root
					title={T()("share_links")}
					description={T()("share_links_setting_message")}
				>
					<InfoRow.Content
						title={T()("delete_all_share_links_system")}
						description={T()("delete_all_share_links_system_setting_message")}
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
				</InfoRow.Root>

				{/* Cache */}
				<InfoRow.Root
					title={T()("cache")}
					description={T()("cache_setting_message")}
				>
					<InfoRow.Content
						title={T()("clear_cache")}
						description={T()("clear_cache_setting_message")}
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

				{/* Locales */}
				<InfoRow.Root
					title={T()("locales")}
					description={T()("locales_setting_message")}
				>
					<InfoRow.Content
						title={T()("content_locales")}
						description={T()("content_locales_description")}
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

				{/* Supported Features */}
				<InfoRow.Root
					title={T()("supported_features")}
					description={T()("supported_features_setting_message")}
				>
					<InfoRow.Content>
						<DetailsList
							type="pill"
							theme="contained"
							items={[
								{
									label: T()("media_enabled"),
									value: settingsData.data?.data?.media.enabled
										? T()("yes")
										: T()("no"),
								},
							]}
						/>
					</InfoRow.Content>
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
