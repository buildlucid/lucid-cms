import { documentSlots } from "virtual:lucid-admin";
import { useNavigate, useParams } from "@solidjs/router";
import { useQueryClient } from "@tanstack/solid-query";
import type {
	Collection,
	InternalCollectionDocument,
	PreviewMode,
	Refs,
	ResponseBody,
} from "@types";
import {
	FaSolidBarsProgress,
	FaSolidCalendar,
	FaSolidCloudArrowUp,
	FaSolidUser,
	FaSolidUserCheck,
} from "solid-icons/fa";
import { type Accessor, type Component, createMemo, Index } from "solid-js";
import Button from "@/components/Button/Button";
import DeleteDocumentModal from "@/components/DeleteDocumentModal/DeleteDocumentModal";
import DeleteDocumentPermanentlyModal from "@/components/DeleteDocumentPermanentlyModal/DeleteDocumentPermanentlyModal";
import DocumentTableRow from "@/components/DocumentTableRow/DocumentTableRow";
import DuplicateDocumentModal from "@/components/DuplicateDocumentModal/DuplicateDocumentModal";
import EmptyState from "@/components/EmptyState/EmptyState";
import { PaginatedFooter } from "@/components/PaginatedFooter/PaginatedFooter";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import RestoreDocumentModal from "@/components/RestoreDocumentModal/RestoreDocumentModal";
import { Table } from "@/components/Table/Table";
import { resolveSlots } from "@/extensions/slot-policy";
import type { QueryStateResponse } from "@/hooks/useQueryState/useQueryState";
import useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import api from "@/services/api";
import { queryKeys } from "@/services/query-keys";
import contentLocaleStore from "@/store/contentLocaleStore/contentLocaleStore";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import type { CollectionLeafFieldConfig } from "@/types/collection-config";
import {
	documentListingRefIncludes,
	tableHeadColumns,
} from "@/utils/document-table-helpers";
import helpers from "@/utils/helpers";
import { getDocumentRoute } from "@/utils/route-helpers";
import spawnToast from "@/utils/spawn-toast";
import { useDocumentOrderSave } from "./hooks/useDocumentOrderSave";

export const DocumentsList: Component<{
	state: {
		collection?: Collection;
		relationCollections?: Accessor<Collection[]>;
		isLoading: boolean;
		listing: Accessor<CollectionLeafFieldConfig[]>;
		collectionIsSuccess: Accessor<boolean>;
		searchParams: QueryStateResponse;
		showingDeleted: Accessor<boolean>;
		orderMode: Accessor<boolean>;
	};
}> = (props) => {
	// ----------------------------------
	// State & Hooks
	const navigate = useNavigate();
	const params = useParams<{ collectionKey: string }>();
	const queryClient = useQueryClient();
	const rowTarget = useRowTarget({
		triggers: {
			duplicate: false,
			delete: false,
			promote: false,
			publish: false,
			restore: false,
			deletePermanently: false,
		},
	});

	// ----------------------------------
	// Functions
	const documentCreateEntry = () => {
		navigate(
			getDocumentRoute("create", {
				collectionKey: collectionKey(),
			}),
		);
	};

	// ----------------------------------
	// Memos
	const collectionKey = createMemo(() => params.collectionKey);
	const contentLocale = createMemo(
		() => contentLocaleStore.get.contentLocale ?? "",
	);
	const customColumns = createMemo(() =>
		resolveSlots(
			documentSlots.filter((entry) => entry.slot === "document.columnAddition"),
			{ collection: collectionKey() },
		),
	);
	const getCustomHeadColumns = createMemo(() =>
		customColumns().map((entry) => ({
			key: `extension:${entry.key}`,
			label: helpers.getLocaleValue({
				value: entry.column.label,
				fallback: entry.key,
			}),
			sortable: false,
		})),
	);
	const getTableHeadColumns = createMemo(() =>
		tableHeadColumns(props.state.listing()),
	);
	const getListingRefIncludes = createMemo(() =>
		documentListingRefIncludes(props.state.listing()),
	);
	const relationCollectionsByKey = createMemo(
		() =>
			new Map(
				(props.state.relationCollections?.() ?? []).map((collection) => [
					collection.key,
					collection,
				]),
			),
	);
	const workflowHeadColumn = createMemo(() =>
		props.state.collection?.publishing.workflow
			? [
					{
						label: T()("documents.workflow.stage"),
						key: "workflowStage",
						icon: <FaSolidBarsProgress />,
					},
					{
						label: T()("documents.workflow.assigned.to"),
						key: "workflowAssignee",
						icon: <FaSolidUserCheck />,
						minWidth: 200,
					},
				]
			: [],
	);
	const environmentHeadColumns = createMemo(() =>
		(props.state.collection?.publishing.targets ?? []).map((environment) => ({
			label:
				helpers.getLocaleValue({
					value: environment.label,
					fallback: environment.key,
				}) || environment.key,
			key: `envStatus.${environment.key}`,
			icon: <FaSolidCloudArrowUp />,
			minWidth: 140,
			sortable: false,
		})),
	);
	const documentQueryEnabled = createMemo(
		() =>
			props.state.searchParams.ready() === true &&
			props.state.collectionIsSuccess() === true,
	);
	const collectionPermissions = createMemo(
		() => props.state.collection?.permissions,
	);
	const rowsAreSelectable = createMemo(() => {
		//* bulk selection is disabled while reordering
		if (props.state.orderMode()) return false;

		const permissions = collectionPermissions();
		if (!permissions) return false;

		if (props.state.showingDeleted()) {
			return userStore.get.hasPermission([
				permissions.restore,
				permissions.delete,
			]).some;
		}
		return userStore.get.hasPermission([permissions.delete]).some;
	});
	const canRestoreDocuments = createMemo(() => {
		const permission = collectionPermissions()?.restore;
		if (!permission) return false;

		return userStore.get.hasPermission([permission]).some;
	});
	const canDeleteDocuments = createMemo(() => {
		const permission = collectionPermissions()?.delete;
		if (!permission) return false;

		return userStore.get.hasPermission([permission]).some;
	});
	const canUpdateDocuments = createMemo(() => {
		const permission = collectionPermissions()?.update;
		if (!permission) return false;

		return userStore.get.hasPermission([permission]).some;
	});
	const canDuplicateDocuments = createMemo(() => {
		const permissions = collectionPermissions();
		if (!permissions) return false;

		return userStore.get.hasPermission([permissions.read, permissions.create])
			.all;
	});
	//* reorder only after order mode pins the list to manual order
	const rowsAreReorderable = createMemo(
		() =>
			props.state.orderMode() &&
			props.state.collection?.orderable === true &&
			props.state.showingDeleted() === false &&
			props.state.searchParams.sorts().get("order") === "asc" &&
			canUpdateDocuments(),
	);
	const collectionName = createMemo(() =>
		helpers.getLocaleValue({
			value: props.state.collection?.details.labels.plural,
		}),
	);
	const collectionSingularName = createMemo(
		() =>
			helpers.getLocaleValue({
				value: props.state.collection?.details.labels.singular,
			}) || T()("common.collection"),
	);
	const actionCollectionSingularName = createMemo(() =>
		helpers.getLocaleValue({
			value: props.state.collection?.details.labels.singular,
		}),
	);
	const getActionLabel = (action: string) => {
		const collectionSingle = actionCollectionSingularName();
		if (!collectionSingle) return action;

		return T()("actions.with.collection", { action, collectionSingle });
	};
	const isDeletedFilter = createMemo(() =>
		props.state.showingDeleted() ? 1 : 0,
	);
	const noEntriesCopy = createMemo(() => {
		if (props.state.showingDeleted()) {
			return {
				title: T()("empty.states.documents.deleted.title", {
					collectionMultiple: collectionName(),
				}),
				description: T()("empty.states.documents.deleted.description"),
			};
		}
		return {
			title: T()("empty.states.documents.title", {
				collectionMultiple: collectionName(),
			}),
			description: T()("empty.states.documents.description", {
				collectionMultiple: collectionName().toLowerCase(),
				collectionSingle: collectionSingularName().toLowerCase(),
			}),
			button: T()("actions.create.document", {
				collectionSingle: collectionSingularName(),
			}),
		};
	});
	const createEntryCallback = createMemo(() => {
		if (props.state.showingDeleted()) {
			return undefined;
		}
		return documentCreateEntry;
	});

	// ----------------------------------
	// Queries
	const documents = api.documents.useGetMultiple({
		queryParams: {
			queryString: props.state.searchParams.queryString,
			location: {
				collectionKey: collectionKey,
				versionType: "latest",
			},
			filters: {
				isDeleted: isDeletedFilter,
			},
			include: {
				"refs.media": () => getListingRefIncludes()["refs.media"],
				"refs.documents": () => getListingRefIncludes()["refs.documents"],
				"refs.users": () => getListingRefIncludes()["refs.users"],
			},
		},
		enabled: () => documentQueryEnabled(),
	});

	// ----------------------------------
	// Mutations
	const deleteMultiple = api.documents.useDeleteMultiple({
		getCollectionName: collectionSingularName,
	});
	const deleteMultiplePermanently = api.documents.useDeleteMultiplePermanently({
		getCollectionName: collectionSingularName,
	});
	const restoreDocuments = api.documents.useRestore();
	const updateDocumentOrder = api.documents.useUpdateOrder({
		silent: true,
		invalidates: [],
		onError: () => {
			//* restore server order after failed reorder
			queryClient.invalidateQueries({
				queryKey: queryKeys.documents.all(),
			});
			spawnToast({
				title: T()("documents.order.reorder.failed.title"),
				message: T()("documents.order.reorder.failed.message"),
				status: "error",
			});
		},
	});
	const createPreview = api.documents.useCreatePreview();

	const documentOrderSave = useDocumentOrderSave({
		save: (update) => updateDocumentOrder.action.mutateAsync(update),
		onSaved: () =>
			queryClient.invalidateQueries({
				queryKey: queryKeys.documents.all(),
			}),
	});

	// ----------------------------------
	// Functions
	const reorderRows = (dragIndex: number, targetIndex: number) => {
		const rows = documents.data?.data ?? [];
		const dragged = rows[dragIndex];
		if (!dragged) return;

		//* use visible neighbours as order bounds
		const reordered = [...rows];
		reordered.splice(dragIndex, 1);
		reordered.splice(targetIndex, 0, dragged);
		const previousDocumentId = reordered[targetIndex - 1]?.id ?? null;
		const nextDocumentId = reordered[targetIndex + 1]?.id ?? null;

		//* keep rows in place while the reorder mutation runs
		const visibleIds = rows.map((row) => row.id).join(",");
		queryClient.setQueriesData<
			ResponseBody<InternalCollectionDocument[], Refs>
		>({ queryKey: queryKeys.documents.all() }, (old) => {
			if (!old?.data) return old;
			if (old.data.map((row) => row.id).join(",") !== visibleIds) return old;
			return {
				...old,
				data: reordered,
			};
		});

		documentOrderSave.queue({
			collectionKey: collectionKey(),
			id: dragged.id,
			body: {
				previousDocumentId,
				nextDocumentId,
			},
		});
	};
	const copyPreviewUrl = async (documentId: number, mode: PreviewMode) => {
		try {
			const response = await createPreview.action.mutateAsync({
				collectionKey: collectionKey(),
				documentId,
				versionType: "latest",
				mode,
				locale: contentLocale() || undefined,
			});
			if (!response.data.url) {
				spawnToast({
					title: T()("preview.unavailable.title"),
					message: T()("preview.unavailable.message"),
					status: "warning",
				});
				return;
			}
			await navigator.clipboard.writeText(response.data.url);
			spawnToast({
				title: T()("toasts.common.copy.to.clipboard.title"),
				status: "success",
			});
		} catch {
			return;
		}
	};

	// ----------------------------------------
	// Render
	return (
		<>
			<QueryBoundary
				isError={documents.isError}
				isEmpty={documents.data?.data.length === 0}
				queryState={props.state.searchParams}
				empty={
					<EmptyState
						title={noEntriesCopy()?.title}
						description={noEntriesCopy()?.description}
						actions={
							createEntryCallback() ? (
								<Button
									size="sm"
									onClick={createEntryCallback()}
									permission={collectionPermissions()?.create}
								>
									{noEntriesCopy()?.button ?? T()("actions.create.entry")}
								</Button>
							) : undefined
						}
					/>
				}
				class="flex-1 h-full"
			>
				<Table
					key={`documents.list.${props.state.collection?.key}`}
					rows={documents.data?.data.length || 0}
					searchParams={props.state.searchParams}
					head={[
						...getTableHeadColumns(),
						...getCustomHeadColumns(),
						...environmentHeadColumns(),
						...workflowHeadColumn(),
						{
							label: T()("common.created.by"),
							key: "createdBy",
							icon: <FaSolidUser />,
							minWidth: 180,
						},
						{
							label: T()("common.updated.by"),
							key: "updatedBy",
							icon: <FaSolidUser />,
							minWidth: 180,
						},
						{
							label: T()("common.updated.at"),
							key: "updatedAt",
							icon: <FaSolidCalendar />,
							//* lock sorting while editing manual order
							sortable: !props.state.orderMode(),
						},
					]}
					state={{
						isLoading: documents.isFetching || props.state.isLoading,
						isSuccess: documents.isSuccess,
					}}
					options={{
						isSelectable: rowsAreSelectable(),
						allowRestore: props.state.showingDeleted() && canRestoreDocuments(),
						allowDelete: !props.state.showingDeleted() && canDeleteDocuments(),
						allowDeletePermanently:
							props.state.showingDeleted() && canDeleteDocuments(),
					}}
					reorder={{
						enabled: rowsAreReorderable(),
						onReorder: reorderRows,
					}}
					callbacks={{
						deleteRows: async (selected) => {
							const ids: number[] = [];
							for (const i in selected) {
								if (selected[i] && documents.data?.data[i].id) {
									ids.push(documents.data?.data[i].id);
								}
							}
							await deleteMultiple.action.mutateAsync({
								collectionKey: collectionKey(),
								body: {
									ids: ids,
								},
							});
						},
						restoreRows: async (selected) => {
							const ids: number[] = [];
							for (const i in selected) {
								if (selected[i] && documents.data?.data[i].id) {
									ids.push(documents.data?.data[i].id);
								}
							}
							await restoreDocuments.action.mutateAsync({
								collectionKey: collectionKey(),
								body: {
									ids: ids,
								},
							});
						},
						deletePermanentlyRows: async (selected) => {
							const ids: number[] = [];
							for (const i in selected) {
								if (selected[i] && documents.data?.data[i].id) {
									ids.push(documents.data?.data[i].id);
								}
							}
							await deleteMultiplePermanently.action.mutateAsync({
								collectionKey: collectionKey(),
								body: {
									ids: ids,
								},
							});
						},
					}}
				>
					{({ include, isSelectable, selected, setSelected, rowReorder }) => (
						<Index each={documents.data?.data || []}>
							{(doc, i) => (
								<DocumentTableRow
									extensions
									index={i}
									document={doc()}
									refs={documents.data?.refs}
									fieldInclude={props.state.listing()}
									collection={props.state.collection as Collection}
									showEnvironmentStatus={environmentHeadColumns().length > 0}
									collectionsByKey={relationCollectionsByKey()}
									include={include}
									contentLocale={contentLocale()}
									selected={selected[i]}
									reorder={rowReorder.enabled ? { rowReorder } : undefined}
									options={{
										isSelectable,
									}}
									callbacks={{
										setSelected: setSelected,
									}}
									actions={[
										{
											label: getActionLabel(T()("preview.copy.group")),
											type: "group",
											icon: "link",
											actionExclude: true,
											permission: collectionPermissions()?.read
												? userStore.get.hasPermission([
														collectionPermissions()?.read,
													]).some
												: false,
											hide:
												props.state.showingDeleted() ||
												props.state.collection?.capabilities.preview !== true,
											actions: [
												{
													label: getActionLabel(T()("preview.copy.scoped")),
													type: "button",
													icon: "lock",
													onClick: () =>
														void copyPreviewUrl(doc().id, "scoped"),
													isLoading: createPreview.action.isPending,
													permission: collectionPermissions()?.read
														? userStore.get.hasPermission([
																collectionPermissions()?.read,
															]).some
														: false,
												},
												{
													label: getActionLabel(T()("preview.copy.navigable")),
													type: "button",
													icon: "share",
													onClick: () =>
														void copyPreviewUrl(doc().id, "perspective"),
													isLoading: createPreview.action.isPending,
													permission: collectionPermissions()?.read
														? userStore.get.hasPermission([
																collectionPermissions()?.read,
															]).some
														: false,
												},
											],
										},
										{
											label: getActionLabel(T()("common.edit")),
											type: "button",
											icon: "pen",
											onClick: () => {
												navigate(
													getDocumentRoute("edit", {
														collectionKey: props.state.collection
															?.key as string,
														documentId: doc().id,
													}),
												);
											},
											permission: collectionPermissions()?.update
												? userStore.get.hasPermission([
														collectionPermissions()?.update,
													]).some
												: false,
											hide: props.state.showingDeleted(),
										},
										{
											label: getActionLabel(T()("common.preview")),
											type: "button",
											icon: "eye",
											onClick: () => {
												navigate(
													getDocumentRoute("edit", {
														collectionKey: props.state.collection
															?.key as string,
														documentId: doc().id,
													}),
												);
											},
											permission: collectionPermissions()?.read
												? userStore.get.hasPermission([
														collectionPermissions()?.read,
													]).some
												: false,
											hide: props.state.showingDeleted() === false,
										},
										{
											label: getActionLabel(T()("common.duplicate")),
											type: "button",
											icon: "copy",
											onClick: () => {
												rowTarget.setTargetId(doc().id);
												rowTarget.setTrigger("duplicate", true);
											},
											permission: canDuplicateDocuments(),
											hide:
												props.state.showingDeleted() ||
												props.state.collection?.locked === true ||
												props.state.collection?.mode !== "multiple",
										},
										{
											label: getActionLabel(T()("common.restore")),
											type: "button",
											icon: "restore",
											onClick: () => {
												rowTarget.setTargetId(doc().id);
												rowTarget.setTrigger("restore", true);
											},
											permission: collectionPermissions()?.restore
												? userStore.get.hasPermission([
														collectionPermissions()?.restore,
													]).all
												: false,
											hide: props.state.showingDeleted() === false,
											theme: "primary",
										},
										{
											label: getActionLabel(T()("common.delete")),
											type: "button",
											icon: "trash",
											onClick: () => {
												rowTarget.setTargetId(doc().id);
												rowTarget.setTrigger("delete", true);
											},
											permission: collectionPermissions()?.delete
												? userStore.get.hasPermission([
														collectionPermissions()?.delete,
													]).all
												: false,
											actionExclude: true,
											theme: "error",
											hide: props.state.showingDeleted(),
										},
										{
											label: getActionLabel(T()("actions.delete.permanently")),
											type: "button",
											icon: "trash",
											onClick: () => {
												rowTarget.setTargetId(doc().id);
												rowTarget.setTrigger("deletePermanently", true);
											},
											permission: collectionPermissions()?.delete
												? userStore.get.hasPermission([
														collectionPermissions()?.delete,
													]).all
												: false,
											hide: props.state.showingDeleted?.() === false,
											theme: "error",
										},
									]}
								/>
							)}
						</Index>
					)}
				</Table>
				<DeleteDocumentModal
					id={rowTarget.getTargetId}
					state={{
						open: rowTarget.getTriggers().delete,
						setOpen: (state: boolean) => {
							rowTarget.setTrigger("delete", state);
						},
					}}
					collection={props.state.collection as Collection}
				/>
				<DuplicateDocumentModal
					id={rowTarget.getTargetId}
					state={{
						open: rowTarget.getTriggers().duplicate,
						setOpen: (state: boolean) => {
							rowTarget.setTrigger("duplicate", state);
						},
					}}
					collection={props.state.collection as Collection}
					callbacks={{
						onSuccess: (documentId) => {
							navigate(
								getDocumentRoute("edit", {
									collectionKey: collectionKey(),
									documentId,
								}),
							);
						},
					}}
				/>
				{/* TODO: add support to selec the target environment */}
				{/* <PromoteToDraft
			id={rowTarget.getTargetId}
			publishedVersionId={getPublishedVersionId}
			collection={props.state.collection as Collection}
			state={{
				open: rowTarget.getTriggers().promote,
				setOpen: (state: boolean) => {
					rowTarget.setTrigger("promote", state);
				},
			}}
			callbacks={{
				onSuccess: () => {
					navigate(
						getDocumentRoute("edit", {
							collectionKey: props.state.collection?.key as string,
							documentId: getDocumentId(),
						}),
					);
				},
			}}
		/> */}
				{/* <PublishDocument
			id={rowTarget.getTargetId}
			draftVersionId={getDraftVersionId}
			collection={props.state.collection as Collection}
			state={{
				open: rowTarget.getTriggers().publish,
				setOpen: (state: boolean) => {
					rowTarget.setTrigger("publish", state);
				},
			}}
			callbacks={{
				onSuccess: () => {
					navigate(
						getDocumentRoute("edit", {
							collectionKey: props.state.collection?.key as string,
							documentId: getDocumentId(),
							version: "latest",
						}),
					);
				},
			}}
		/> */}
				<RestoreDocumentModal
					id={rowTarget.getTargetId}
					collection={props.state.collection}
					state={{
						open: rowTarget.getTriggers().restore,
						setOpen: (state: boolean) => {
							rowTarget.setTrigger("restore", state);
						},
					}}
				/>
				<DeleteDocumentPermanentlyModal
					id={rowTarget.getTargetId}
					collection={props.state.collection as Collection}
					state={{
						open: rowTarget.getTriggers().deletePermanently,
						setOpen: (state: boolean) => {
							rowTarget.setTrigger("deletePermanently", state);
						},
					}}
				/>
			</QueryBoundary>
			<PaginatedFooter
				state={{
					searchParams: props.state.searchParams,
					meta: documents.data?.meta,
				}}
				options={{
					padding: "24",
				}}
			/>
		</>
	);
};
