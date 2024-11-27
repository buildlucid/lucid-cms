import T from "@/translations";
import { type Component, createMemo, createSignal } from "solid-js";
import helpers from "@/utils/helpers";
import api from "@/services/api";
import userStore from "@/store/userStore";
import contentLocaleStore from "@/store/contentLocaleStore";
import InfoRow from "@/components/Blocks/InfoRow";
import Button from "@/components/Partials/Button";
import ProgressBar from "@/components/Partials/ProgressBar";
import ClearAllProcessedImages from "@/components/Modals/Media/ClearAllProcessedImages";
import DetailsList from "@/components/Partials/DetailsList";
import Layout from "@/components/Groups/Layout";
import Headers from "@/components/Groups/Headers";

const GeneralSettingsRoute: Component = (props) => {
	// ----------------------------------------
	// State / Hooks
	const [getOpenClearAllProcessedImages, setOpenClearAllProcessedImages] =
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
		const total = settingsData.data?.data?.media.storage.limit || 0;
		const remaining = settingsData.data?.data?.media.storage.remaining || 0;

		return Math.floor(((total - remaining) / total) * 100);
	});
	const contentLocales = createMemo(() => contentLocaleStore.get.locales);

	// ----------------------------------------
	// Render

	return (
		<Layout.Wrapper
			slots={{
				header: (
					<Headers.Standard
						copy={{
							title: T()("settings_route_title"),
							description: T()("settings_route_description"),
						}}
						slots={{
							bottom: (
								<Layout.NavigationTabs
									tabs={[
										{
											label: T()("general"),
											href: "/admin/settings",
										},
										{
											label: T()("client_integrations"),
											href: "/admin/settings/client-integrations",
										},
									]}
								/>
							),
						}}
					/>
				),
			}}
		>
			<Layout.DynamicContent
				state={{
					isError: settingsData.isError,
					isSuccess: settingsData.isSuccess,
					isLoading: settingsData.isLoading,
				}}
				options={{
					padding: "30",
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
									settingsData.data?.data?.media.storage.limit,
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
					>
						<Button
							size="small"
							type="button"
							theme="danger"
							onClick={() => {
								setOpenClearAllProcessedImages(true);
							}}
							permission={userStore.get.hasPermission(["update_media"]).all}
						>
							{T()("clear_all_processed_images_button", {
								count: settingsData.data?.data?.media.processed.total || 0,
							})}
						</Button>
					</InfoRow.Content>
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
							items={
								contentLocales().map((locale) => ({
									label: locale.name || locale.code,
									value: `${locale.code} ${
										locale.isDefault === 1 ? `(${T()("default")})` : ""
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
							items={[
								{
									label: T()("media_enabled"),
									value: settingsData.data?.data?.media.enabled
										? T()("yes")
										: T()("no"),
								},
								{
									label: T()("email_enabled"),
									value: settingsData.data?.data?.email.enabled
										? T()("yes")
										: T()("no"),
								},
							]}
						/>
					</InfoRow.Content>
				</InfoRow.Root>
			</Layout.DynamicContent>

			{/* Modals */}
			<ClearAllProcessedImages
				state={{
					open: getOpenClearAllProcessedImages(),
					setOpen: setOpenClearAllProcessedImages,
				}}
			/>
		</Layout.Wrapper>
	);
};

export default GeneralSettingsRoute;
