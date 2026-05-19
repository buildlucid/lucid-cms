import { type Component, createMemo, createSignal } from "solid-js";
import InfoRow from "@/components/Blocks/InfoRow";
import UpdateSystemAlertsForm from "@/components/Forms/System/UpdateSystemAlertsForm";
import { Standard } from "@/components/Groups/Headers";
import {
	DynamicContent,
	NavigationTabs,
	Wrapper,
} from "@/components/Groups/Layout";
import ClearAllProcessedImages from "@/components/Modals/Media/ClearAllProcessedImages";
import DeleteAllShareLinksSystem from "@/components/Modals/Media/DeleteAllShareLinksSystem";
import ClearCache from "@/components/Modals/System/ClearCache";
import Button from "@/components/Partials/Button";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import userStore from "@/store/userStore";
import T from "@/translations";

const SystemOperationsRoute: Component = () => {
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
				media: true,
				system: true,
			},
		},
	});

	// ----------------------------------------
	// Memos
	const systemInfo = createMemo(() => settingsData.data?.data?.system);
	const canClearCache = createMemo(
		() => userStore.get.hasPermission([Permissions.CacheClear]).all,
	);
	const canDeleteAllShareLinks = createMemo(
		() => userStore.get.hasPermission([Permissions.MediaDelete]).all,
	);
	const canClearAllProcessedImages = createMemo(
		() => userStore.get.hasPermission([Permissions.MediaUpdate]).all,
	);
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
					title={T()("system_alerts")}
					description={T()("system_alerts_description")}
				>
					<InfoRow.Content
						title={T()(Permissions.SettingsUpdate)}
						description={T()("system_alert_email_description")}
						reducedMargin={true}
					>
						<UpdateSystemAlertsForm
							alertEmail={systemInfo()?.alertEmail ?? null}
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

export default SystemOperationsRoute;
