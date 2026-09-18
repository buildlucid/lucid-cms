import { type Component, createMemo, createSignal } from "solid-js";
import Button from "@/components/Button/Button";
import ClearAllProcessedImagesModal from "@/components/ClearAllProcessedImagesModal/ClearAllProcessedImagesModal";
import ClearCacheModal from "@/components/ClearCacheModal/ClearCacheModal";
import DeleteAllShareLinksSystemModal from "@/components/DeleteAllShareLinksSystemModal/DeleteAllShareLinksSystemModal";
import DetailsList from "@/components/DetailsList/DetailsList";
import { DynamicContent } from "@/components/DynamicContent/DynamicContent";
import InfoRow from "@/components/InfoRow/InfoRow";
import LucidConnection from "@/components/LucidConnection/LucidConnection";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import SystemSettingsHeader from "@/components/SystemSettingsHeader/SystemSettingsHeader";
import UpdateSystemAlertsModal from "@/components/UpdateSystemAlertsModal/UpdateSystemAlertsModal";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import T from "@/translations";

const SystemOperationsPage: Component = () => {
	// ----------------------------------------
	// State / Hooks
	const [getOpenClearAllProcessedImages, setOpenClearAllProcessedImages] =
		createSignal(false);
	const [getOpenClearCache, setOpenClearCache] = createSignal(false);
	const [getOpenDeleteAllShareLinks, setOpenDeleteAllShareLinks] =
		createSignal(false);
	const [updateSystemAlertsOpen, setUpdateSystemAlertsOpen] =
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

	// ----------------------------------------
	// Render
	return (
		<PageLayout
			slots={{
				header: <SystemSettingsHeader />,
			}}
		>
			<DynamicContent
				options={{
					padding: "24",
				}}
			>
				{/* Lucid Connection */}
				<InfoRow.Root
					title={T()("connection.manage.title")}
					description={T()("connection.manage.description")}
				>
					<LucidConnection />
				</InfoRow.Root>

				{/* Settings */}
				<DynamicContent
					state={{
						isError: settingsData.isError,
						isSuccess: settingsData.isSuccess,
						isLoading: settingsData.isLoading,
					}}
					options={{
						inline: true,
					}}
				>
					{/* System Alerts */}
					<InfoRow.Root
						title={T()("system.alerts.title")}
						description={T()("system.alerts.description")}
					>
						<InfoRow.Content
							title={T()("system.alerts.delivery.title")}
							description={T()("system.alerts.email.description")}
							actions={
								<Button
									size="sm"
									type="button"
									variant="outline"
									permission={Permissions.SettingsUpdate}
									onClick={() => setUpdateSystemAlertsOpen(true)}
								>
									{T()("system.alerts.edit.action")}
								</Button>
							}
							actionAlignment="center"
						>
							<DetailsList
								type="text"
								theme="contained"
								items={[
									{
										label: T()("common.alert.email"),
										value: systemInfo()?.alertEmail || T()("common.not.set"),
										wrap: true,
									},
								]}
							/>
						</InfoRow.Content>
					</InfoRow.Root>

					{/* Maintenance */}
					<InfoRow.Root
						title={T()("system.maintenance.title")}
						description={T()("system.maintenance.description")}
					>
						<InfoRow.Content
							title={T()("common.actions.clear.all")}
							description={T()("media.processed.clear.all.settings.message")}
							reducedMargin={true}
							actions={
								<Button
									size="md"
									type="button"
									variant="danger"
									onClick={() => {
										setOpenClearAllProcessedImages(true);
									}}
									permission={Permissions.MediaUpdate}
								>
									{T()("media.processed.clear.all.action", {
										count: settingsData.data?.data?.media?.processed.total || 0,
									})}
								</Button>
							}
							actionAlignment="center"
						/>
						<InfoRow.Content
							title={T()("media.share.links.system.delete.all.title")}
							description={T()(
								"media.share.links.system.delete.all.settings.message",
							)}
							reducedMargin={true}
							actions={
								<Button
									size="md"
									type="button"
									variant="danger"
									onClick={() => {
										setOpenDeleteAllShareLinks(true);
									}}
									permission={Permissions.MediaDelete}
								>
									{T()("media.share.links.system.delete.all.action")}
								</Button>
							}
							actionAlignment="center"
						/>
						<InfoRow.Content
							title={T()("system.cache.clear.title")}
							description={T()("system.cache.setting.message")}
							reducedMargin={true}
							actions={
								<Button
									size="md"
									type="button"
									variant="danger"
									onClick={() => {
										setOpenClearCache(true);
									}}
									permission={Permissions.CacheClear}
								>
									{T()("system.cache.button")}
								</Button>
							}
							actionAlignment="center"
						/>
					</InfoRow.Root>
				</DynamicContent>
			</DynamicContent>

			{/* Modals */}
			<UpdateSystemAlertsModal
				state={{
					open: updateSystemAlertsOpen(),
					setOpen: setUpdateSystemAlertsOpen,
				}}
				alertEmail={systemInfo()?.alertEmail ?? null}
			/>
			<ClearAllProcessedImagesModal
				state={{
					open: getOpenClearAllProcessedImages(),
					setOpen: setOpenClearAllProcessedImages,
				}}
			/>
			<DeleteAllShareLinksSystemModal
				state={{
					open: getOpenDeleteAllShareLinks(),
					setOpen: setOpenDeleteAllShareLinks,
				}}
			/>
			<ClearCacheModal
				state={{
					open: getOpenClearCache(),
					setOpen: setOpenClearCache,
				}}
			/>
		</PageLayout>
	);
};

export default SystemOperationsPage;
