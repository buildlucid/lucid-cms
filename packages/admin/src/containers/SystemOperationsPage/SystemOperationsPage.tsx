import { type Component, createMemo, createSignal } from "solid-js";
import Button from "@/components/Button/Button";
import ClearAllProcessedImagesModal from "@/components/ClearAllProcessedImagesModal/ClearAllProcessedImagesModal";
import ClearCacheModal from "@/components/ClearCacheModal/ClearCacheModal";
import DeleteAllShareLinksSystemModal from "@/components/DeleteAllShareLinksSystemModal/DeleteAllShareLinksSystemModal";
import DetailsList from "@/components/DetailsList/DetailsList";
import InfoRow from "@/components/InfoRow/InfoRow";
import LucidConnection from "@/components/LucidConnection/LucidConnection";
import PageLayout from "@/components/PageLayout/PageLayout";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
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
		<PageLayout.Root>
			<SystemSettingsHeader />
			<PageLayout.Body>
				<div class="flex-1 h-full p-4 md:p-6">
					{/* Lucid Connection */}
					<InfoRow.Root
						title={T()("connection.manage.title")}
						description={T()("connection.manage.description")}
					>
						<LucidConnection />
					</InfoRow.Root>

					{/* Settings */}
					<QueryBoundary
						loading={settingsData.isLoading}
						error={settingsData.isError}
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
								align="center"
							>
								<DetailsList
									variant="plain"
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
											count:
												settingsData.data?.data?.media?.processed.total || 0,
										})}
									</Button>
								}
								align="center"
							/>
							<InfoRow.Content
								title={T()("media.share.links.system.delete.all.title")}
								description={T()(
									"media.share.links.system.delete.all.settings.message",
								)}
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
								align="center"
							/>
							<InfoRow.Content
								title={T()("system.cache.clear.title")}
								description={T()("system.cache.setting.message")}
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
								align="center"
							/>
						</InfoRow.Root>
					</QueryBoundary>
				</div>

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
			</PageLayout.Body>
		</PageLayout.Root>
	);
};

export default SystemOperationsPage;
