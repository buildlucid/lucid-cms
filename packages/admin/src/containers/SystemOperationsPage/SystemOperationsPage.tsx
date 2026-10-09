import { type Component, createSignal } from "solid-js";
import Button from "@/components/Button/Button";
import ClearAllProcessedImagesModal from "@/components/ClearAllProcessedImagesModal/ClearAllProcessedImagesModal";
import ClearCacheModal from "@/components/ClearCacheModal/ClearCacheModal";
import DeleteAllShareLinksSystemModal from "@/components/DeleteAllShareLinksSystemModal/DeleteAllShareLinksSystemModal";
import InfoRow from "@/components/InfoRow/InfoRow";
import LucidConnection from "@/components/LucidConnection/LucidConnection";
import PageLayout from "@/components/PageLayout/PageLayout";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import { Permissions } from "@/constants/permissions";
import { usePageTitle } from "@/hooks/usePageTitle/usePageTitle";
import api from "@/services/api";
import T from "@/translations";

const SystemOperationsPage: Component = () => {
	// ----------------------------------------
	// State / Hooks
	usePageTitle(() => T()("routes.system.operations.title"));
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

					{/* Settings */}
					<QueryBoundary
						loading={settingsData.isLoading}
						error={settingsData.isError}
					>
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
