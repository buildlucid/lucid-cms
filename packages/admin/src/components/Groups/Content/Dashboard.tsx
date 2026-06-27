import {
	FaSolidDatabase,
	FaSolidFolderPlus,
	FaSolidImages,
	FaSolidKey,
	FaSolidPlus,
	FaSolidTriangleExclamation,
	FaSolidUpload,
	FaSolidUser,
	FaSolidUserCheck,
} from "solid-icons/fa";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import {
	DashboardAttention,
	type DashboardAttentionItem,
	DashboardContentShortcuts,
	type DashboardQuickAction,
	DashboardQuickActions,
	DashboardReleaseOverview,
} from "@/components/Groups/Dashboard";
import { DynamicContent } from "@/components/Groups/Layout";
import MediaAltGenerationModal from "@/components/Modals/AI/MediaAltGenerationModal";
import MediaImageGenerationModal from "@/components/Modals/AI/MediaImageGenerationModal";
import BulkUploadMediaModal from "@/components/Modals/Media/BulkUploadMedia";
import CreateMediaFolderModal from "@/components/Modals/Media/CreateMediaFolder";
import CreateUpdateMediaPanel from "@/components/Panels/Media/CreateUpdateMediaPanel";
import CreateUserPanel from "@/components/Panels/User/CreateUserPanel";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import siteStore from "@/store/siteStore";
import userStore from "@/store/userStore";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getDocumentRoute } from "@/utils/route-helpers";

export const Dashboard: Component = () => {
	// ----------------------------------------
	// State
	const [createMediaPanelOpen, setCreateMediaPanelOpen] = createSignal(false);
	const [bulkUploadModalOpen, setBulkUploadModalOpen] = createSignal(false);
	const [createFolderModalOpen, setCreateFolderModalOpen] = createSignal(false);
	const [createUserPanelOpen, setCreateUserPanelOpen] = createSignal(false);

	// ----------------------------------------
	// Permissions
	const canReadSystemOverview = createMemo(
		() => userStore.get.hasPermission([Permissions.SettingsRead]).all,
	);
	const canCreateMedia = createMemo(
		() => userStore.get.hasPermission([Permissions.MediaCreate]).all,
	);
	const canReviewDocuments = createMemo(
		() => userStore.get.hasPermission([Permissions.DocumentsReview]).all,
	);
	const canCreateUsers = createMemo(
		() => userStore.get.hasPermission([Permissions.UsersCreate]).all,
	);
	const canManageLicense = createMemo(
		() => userStore.get.hasPermission([Permissions.LicenseUpdate]).all,
	);

	// ----------------------------------------
	// Queries
	const settings = api.settings.useGetSettings({
		queryParams: {
			include: {
				media: true,
			},
		},
		enabled: () => canReadSystemOverview(),
	});
	const collections = api.collections.useGetAll({
		queryParams: {},
	});

	// ----------------------------------------
	// Memos
	const collectionsData = createMemo(() => collections.data?.data ?? []);

	const releaseRequestsAvailable = createMemo(
		() =>
			canReviewDocuments() &&
			collectionsData().some(
				(collection) => (collection.review?.requiredFor?.length ?? 0) > 0,
			),
	);

	// ----------------------------------------
	// Queries
	const releaseOverview = api.publishOperations.useGetOverview({
		queryParams: {},
		enabled: () => releaseRequestsAvailable(),
	});

	// ----------------------------------------
	// Memos
	const mediaInfo = createMemo(() => settings.data?.data?.media);
	const showLicenseAttention = createMemo(
		() => siteStore.get.license?.valid === false,
	);
	const readableCollections = createMemo(() =>
		collectionsData().filter((collection) => {
			if (collection.mode === "single") {
				return userStore.get.hasPermission([
					collection.permissions.read,
					collection.documentId
						? collection.permissions.update
						: collection.permissions.create,
				]).all;
			}

			return userStore.get.hasPermission([collection.permissions.read]).all;
		}),
	);
	const storagePercentUsed = createMemo(() => {
		const storage = mediaInfo()?.storage;
		if (!storage || storage.total === null || storage.used === null) return 0;
		if (storage.total <= 0 || storage.used <= 0) return 0;
		return Math.max(
			0,
			Math.min(100, Math.floor((storage.used / storage.total) * 100)),
		);
	});
	const storageNeedsAttention = createMemo(() => {
		const storage = mediaInfo()?.storage;
		if (!storage || storage.total === null) return false;
		return storagePercentUsed() >= 90;
	});
	const creatableCollections = createMemo(() =>
		collectionsData()
			.filter((collection) => {
				if (collection.locked) return false;
				if (
					userStore.get.hasPermission([collection.permissions.create]).some ===
					false
				) {
					return false;
				}
				if (collection.mode === "single" && collection.documentId) return false;
				return true;
			})
			.slice(0, 3),
	);
	const createDocumentActions = createMemo<DashboardQuickAction[]>(() =>
		creatableCollections().map((collection) => {
			const name =
				helpers.getLocaleValue({
					value: collection.details.singularName,
					fallback: collection.key,
				}) || collection.key;
			return {
				key: `create-${collection.key}`,
				title: T()("actions.create.dynamic", {
					name,
				}),
				description: T()(
					"dashboard.quick.actions.create.document.description",
					{
						name,
					},
				),
				icon: <FaSolidPlus size={14} />,
				href: getDocumentRoute("create", {
					collectionKey: collection.key,
				}),
			};
		}),
	);
	const quickActions = createMemo<DashboardQuickAction[]>(() => [
		...createDocumentActions(),
		{
			key: "upload-media",
			title: T()("media.upload.action"),
			description: T()("dashboard.quick.actions.upload.media.description"),
			icon: <FaSolidUpload size={14} />,
			onClick: () => setCreateMediaPanelOpen(true),
			show: canCreateMedia(),
		},
		{
			key: "bulk-upload-media",
			title: T()("media.upload.bulk.action"),
			description: T()("dashboard.quick.actions.bulk.upload.description"),
			icon: <FaSolidImages size={14} />,
			onClick: () => setBulkUploadModalOpen(true),
			show: canCreateMedia(),
		},
		{
			key: "create-folder",
			title: T()("media.folders.add"),
			description: T()("dashboard.quick.actions.create.folder.description"),
			icon: <FaSolidFolderPlus size={14} />,
			onClick: () => setCreateFolderModalOpen(true),
			show: canCreateMedia(),
		},
		{
			key: "review-releases",
			title: T()("dashboard.quick.actions.review.releases.title"),
			description: T()("dashboard.quick.actions.review.releases.description"),
			icon: <FaSolidUserCheck size={14} />,
			href: "/lucid/release-requests?filter[assignedToMe]=true",
			show: releaseRequestsAvailable(),
		},
		{
			key: "invite-user",
			title: T()("users.add"),
			description: T()("dashboard.quick.actions.invite.user.description"),
			icon: <FaSolidUser size={14} />,
			onClick: () => setCreateUserPanelOpen(true),
			show: canCreateUsers(),
		},
	]);
	const visibleQuickActions = createMemo(() =>
		quickActions().filter((action) => action.show !== false),
	);
	const showContentShortcuts = createMemo(
		() =>
			collections.isLoading ||
			collections.isError ||
			readableCollections().length > 0,
	);
	const attentionItems = createMemo<DashboardAttentionItem[]>(() => {
		const items: DashboardAttentionItem[] = [];
		const overview = releaseOverview.data?.data;

		if (showLicenseAttention() && canManageLicense()) {
			items.push({
				key: "license",
				title: T()("license.dashboard.banner.title"),
				description: T()("license.dashboard.banner.description"),
				icon: <FaSolidKey size={14} />,
				tone: "warning",
				action: {
					label: T()("license.dashboard.banner.action"),
					href: "/lucid/system/license",
				},
			});
		}

		if (canReadSystemOverview() && mediaInfo()?.enabled === false) {
			items.push({
				key: "media-disabled",
				title: T()("dashboard.attention.media.disabled.title"),
				description: T()("media.storage.strategy.missing.message"),
				icon: <FaSolidTriangleExclamation size={14} />,
				tone: "warning",
				action: {
					label: T()("dashboard.attention.view.system"),
					href: "/lucid/system/overview",
				},
			});
		}

		if (canReadSystemOverview() && storageNeedsAttention()) {
			items.push({
				key: "storage",
				title: T()("dashboard.attention.storage.title", {
					percent: storagePercentUsed(),
				}),
				description: T()("dashboard.attention.storage.description", {
					remaining: helpers.bytesToSize(mediaInfo()?.storage.remaining),
				}),
				icon: <FaSolidDatabase size={14} />,
				tone: storagePercentUsed() >= 98 ? "danger" : "warning",
				action: {
					label: T()("dashboard.attention.view.system"),
					href: "/lucid/system/overview",
				},
			});
		}

		if (releaseRequestsAvailable() && (overview?.assignedToMe ?? 0) > 0) {
			items.push({
				key: "assigned-releases",
				title: T()("dashboard.attention.release.assigned.title", {
					count: overview?.assignedToMe ?? 0,
				}),
				description: T()("dashboard.attention.release.assigned.description"),
				icon: <FaSolidUserCheck size={14} />,
				tone: "info",
				action: {
					label: T()("dashboard.attention.review.now"),
					href: "/lucid/release-requests?filter[assignedToMe]=true",
				},
			});
		}

		if (releaseRequestsAvailable() && (overview?.failed ?? 0) > 0) {
			items.push({
				key: "failed-releases",
				title: T()("dashboard.attention.release.failed.title", {
					count: overview?.failed ?? 0,
				}),
				description: T()("dashboard.attention.release.failed.description"),
				icon: <FaSolidTriangleExclamation size={14} />,
				tone: "danger",
				action: {
					label: T()("dashboard.attention.view.failed"),
					href: "/lucid/release-requests?filter[executionStatus]=failed",
				},
			});
		}

		return items;
	});

	// ----------------------------------------
	// Render
	return (
		<>
			<DynamicContent
				options={{
					padding: "24",
				}}
			>
				<div class="flex min-w-0 flex-col gap-6">
					<Show when={attentionItems().length > 0}>
						<DashboardAttention items={attentionItems()} />
					</Show>
					<Show when={visibleQuickActions().length > 0}>
						<DashboardQuickActions actions={visibleQuickActions()} />
					</Show>
					<Show when={releaseRequestsAvailable()}>
						<DashboardReleaseOverview
							overview={releaseOverview.data?.data}
							loading={releaseOverview.isFetching}
						/>
					</Show>
					<Show when={showContentShortcuts()}>
						<DashboardContentShortcuts
							collections={readableCollections()}
							loading={collections.isLoading}
							error={collections.isError}
						/>
					</Show>
				</div>
			</DynamicContent>

			<MediaAltGenerationModal />
			<MediaImageGenerationModal />
			<CreateUpdateMediaPanel
				state={{
					open: createMediaPanelOpen(),
					setOpen: setCreateMediaPanelOpen,
					parentFolderId: () => undefined,
				}}
			/>
			<BulkUploadMediaModal
				state={{
					open: bulkUploadModalOpen(),
					setOpen: setBulkUploadModalOpen,
					parentFolderId: () => undefined,
				}}
			/>
			<CreateMediaFolderModal
				state={{
					open: createFolderModalOpen(),
					setOpen: setCreateFolderModalOpen,
					parentFolderId: () => undefined,
				}}
			/>
			<CreateUserPanel
				state={{
					open: createUserPanelOpen(),
					setOpen: setCreateUserPanelOpen,
				}}
			/>
		</>
	);
};
