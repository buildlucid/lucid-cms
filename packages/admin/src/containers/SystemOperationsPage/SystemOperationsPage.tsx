import { type Component, createSignal } from "solid-js";
import Button from "@/components/Button/Button";
import ClearAllProcessedImagesModal from "@/components/ClearAllProcessedImagesModal/ClearAllProcessedImagesModal";
import ClearCacheModal from "@/components/ClearCacheModal/ClearCacheModal";
import DeleteAllShareLinksSystemModal from "@/components/DeleteAllShareLinksSystemModal/DeleteAllShareLinksSystemModal";
import InfoRow from "@/components/InfoRow/InfoRow";
import LucidConnection from "@/components/LucidConnection/LucidConnection";
import MaintenanceGroups from "@/components/MaintenanceGroups/MaintenanceGroups";
import MaintenanceTile from "@/components/MaintenanceTile/MaintenanceTile";
import PageLayout from "@/components/PageLayout/PageLayout";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import { Permissions } from "@/constants/permissions";
import { usePageTitle } from "@/hooks/usePageTitle/usePageTitle";
import api from "@/services/api";
import T from "@/translations";

const SystemOperationsPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	usePageTitle(() => T()("routes.system.operations.title"));
	const [getOpenClearAllProcessedImages, setOpenClearAllProcessedImages] =
		createSignal(false);
	const [getOpenClearCache, setOpenClearCache] = createSignal(false);
	const [getOpenDeleteAllShareLinks, setOpenDeleteAllShareLinks] =
		createSignal(false);

	// ----------------------------------------
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
	// Render
	return (
		<PageLayout.Root>
			<PageLayout.Header
				title={T()("routes.system.operations.title")}
				description={T()("routes.system.operations.description")}
			/>
			<PageLayout.Body>
				<div class="flex-1 h-full p-4 md:p-6">
					{/* Lucid Connection */}
					<InfoRow.Root
						title={T()("connection.manage.title")}
						description={T()("connection.manage.description")}
					>
						<LucidConnection />
					</InfoRow.Root>

					{/* Maintenance */}
					<InfoRow.Root
						title={T()("system.maintenance.title")}
						description={T()("system.maintenance.description")}
					>
						<QueryBoundary
							loading={settingsData.isLoading}
							error={settingsData.isLoadingError}
							loadingFallback={
								<div class="grid gap-2 sm:grid-cols-2">
									<span class="skeleton block h-48 w-full" />
									<span class="skeleton block h-48 w-full" />
									<span class="skeleton block h-48 w-full" />
								</div>
							}
							appearance="card"
							onRetry={() => settingsData.refetch()}
						>
							{/* plugins add tiles through the `maintenance.action` slot */}
							<MaintenanceGroups
								tiles={[
									{
										key: "lucid.processedImages",
										group: "rebuild",
										render: () => (
											<MaintenanceTile
												icon="image"
												title={T()("media.processed.title")}
												description={T()(
													"media.processed.clear.all.settings.message",
												)}
												status={T()("system.maintenance.processed.status", {
													count:
														settingsData.data?.data?.media?.processed.total ||
														0,
												})}
												action={
													<Button
														type="button"
														size="sm"
														variant="outline"
														permission={Permissions.MediaUpdate}
														onClick={() => setOpenClearAllProcessedImages(true)}
													>
														{T()("media.processed.clear.action")}
													</Button>
												}
											/>
										),
									},
									{
										key: "lucid.cache",
										group: "rebuild",
										render: () => (
											<MaintenanceTile
												icon="cache"
												title={T()("system.maintenance.cache.title")}
												description={T()("system.cache.setting.message")}
												status={settingsData.data?.data?.system?.kv}
												action={
													<Button
														type="button"
														size="sm"
														variant="outline"
														permission={Permissions.CacheClear}
														onClick={() => setOpenClearCache(true)}
													>
														{T()("system.cache.button")}
													</Button>
												}
											/>
										),
									},
									{
										key: "lucid.shareLinks",
										group: "remove",
										render: () => (
											<MaintenanceTile
												icon="share"
												title={T()("system.maintenance.share.links.title")}
												description={T()(
													"media.share.links.system.delete.all.settings.message",
												)}
												action={
													<Button
														type="button"
														size="sm"
														variant="danger-outline"
														permission={Permissions.MediaDelete}
														onClick={() => setOpenDeleteAllShareLinks(true)}
													>
														{T()("media.share.links.system.delete.all.action")}
													</Button>
												}
											/>
										),
									},
								]}
							/>
						</QueryBoundary>
					</InfoRow.Root>
				</div>

				{/* Modals */}
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
