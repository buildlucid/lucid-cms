import T from "@/translations";
import { useParams, useNavigate } from "@solidjs/router";
import {
	type Component,
	createMemo,
	createSignal,
	Show,
	Switch,
	Match,
	createEffect,
	on,
} from "solid-js";
import classNames from "classnames";
import { useQueryClient } from "@tanstack/solid-query";
import type { CollectionResponse, FieldErrors } from "@lucidcms/core/types";
import api from "@/services/api";
import brickStore from "@/store/brickStore";
import brickHelpers from "@/utils/brick-helpers";
import { getBodyError } from "@/utils/error-helpers";
import contentLocaleStore from "@/store/contentLocaleStore";
import DetailsList from "@/components/Partials/DetailsList";
import DateText from "@/components/Partials/DateText";
import DeleteDocument from "@/components/Modals/Documents/DeleteDocument";
import { getDocumentRoute } from "@/utils/route-helpers";
import NavigationGuard, {
	navGuardHook,
} from "@/components/Modals/NavigationGuard";
import Document from "@/components/Groups/Document";
import MediaSelectModal from "@/components/Modals/Media/MediaSelect";
import DocumentSelectModal from "@/components/Modals/Documents/DocumentSelect";
import LinkSelectModal from "@/components/Modals/CustomField/LinkSelect";
import UserDisplay from "@/components/Partials/UserDisplay";
import BrickImagePreview from "@/components/Modals/Bricks/ImagePreview";
import Pill from "@/components/Partials/Pill";
import Alert from "@/components/Blocks/Alert";

interface CollectionsDocumentsEditRouteProps {
	mode: "create" | "edit";
	version: "draft" | "published";
}

const CollectionsDocumentsEditRoute: Component<
	CollectionsDocumentsEditRouteProps
> = (props) => {
	// ----------------------------------
	// Hooks & State
	const params = useParams();
	const navigate = useNavigate();
	const navGuard = navGuardHook({
		brickMutateLock: true,
	});
	const queryClient = useQueryClient();
	const [getDeleteOpen, setDeleteOpen] = createSignal(false);
	const [getPanelOpen, setPanelOpen] = createSignal(false);

	// ----------------------------------
	// Memos
	const collectionKey = createMemo(() => params.collectionKey);
	const documentId = createMemo(
		() => Number.parseInt(params.documentId) || undefined,
	);
	const contentLocale = createMemo(() => contentLocaleStore.get.contentLocale);
	const canFetchDocument = createMemo(() => {
		return contentLocale() !== undefined && documentId() !== undefined;
	});

	// ----------------------------------
	// Queries
	const collection = api.collections.useGetSingle({
		queryParams: {
			location: {
				collectionKey: collectionKey,
			},
		},
		enabled: () => !!collectionKey(),
		refetchOnWindowFocus: false,
	});
	const doc = api.collections.document.useGetSingle({
		queryParams: {
			location: {
				collectionKey: collectionKey,
				id: documentId,
				version: props.version,
			},
			include: {
				bricks: true,
			},
		},
		enabled: () => canFetchDocument(),
		refetchOnWindowFocus: false,
	});

	// ----------------------------------
	// Mutations
	const createDocument = api.collections.document.useCreateSingle({
		onSuccess: (data) => {
			brickStore.set("fieldsErrors", []);
			navigate(
				getDocumentRoute("edit", {
					collectionKey: collectionKey(),
					useDrafts: collection.data?.data.useDrafts,
					documentId: data.data.id,
				}),
			);
			queryClient.invalidateQueries({
				queryKey: ["collections.getAll"],
			});
			return;
		},
		onError: (errors) => {
			brickStore.set(
				"fieldsErrors",
				getBodyError<FieldErrors[]>("fields", errors) || [],
			);
		},
		getCollectionName: () =>
			collection.data?.data.singular || T()("collection"),
	});
	const updateSingle = api.collections.document.useUpdateSingle({
		onSuccess: () => {
			brickStore.set("fieldsErrors", []);
			brickStore.set("documentMutated", false);
		},
		onError: (errors) => {
			brickStore.set(
				"fieldsErrors",
				getBodyError<FieldErrors[]>("fields", errors) || [],
			);
			brickStore.set("documentMutated", false);
		},
		getCollectionName: () =>
			collection.data?.data.singular || T()("collection"),
	});
	const promoteToPublished = api.collections.document.usePromoteSingle({
		onSuccess: () => {
			brickStore.set("fieldsErrors", []);
			brickStore.set("documentMutated", false);
		},
		onError: (errors) => {
			brickStore.set(
				"fieldsErrors",
				getBodyError<FieldErrors[]>("fields", errors) || [],
			);
			brickStore.set("documentMutated", false);
		},
		getCollectionName: () =>
			collection.data?.data.singular || T()("collection"),
		getVersionType: () => "published",
	});

	// ----------------------------------
	// Memos
	const isLoading = createMemo(() => {
		return collection.isLoading || doc.isLoading;
	});
	const isSuccess = createMemo(() => {
		if (props.mode === "create") {
			return collection.isSuccess;
		}
		return collection.isSuccess && doc.isSuccess;
	});
	const isSaving = createMemo(() => {
		return (
			updateSingle.action.isPending ||
			createDocument.action.isPending ||
			doc.isRefetching ||
			doc.isLoading
		);
	});
	const mutateErrors = createMemo(() => {
		return updateSingle.errors() || createDocument.errors();
	});
	const brickTranslationErrors = createMemo(() => {
		const errors = getBodyError<FieldErrors[]>("fields", mutateErrors());
		if (errors === undefined) return false;
		return errors.some((field) => field.localeCode !== contentLocale());
	});
	const canSaveDocument = createMemo(() => {
		return !brickStore.get.documentMutated && !isSaving();
	});
	const canPublishDocument = createMemo(() => {
		// If published promotedFrom is equal to the current draft versionId, then its already published
		if (
			doc.data?.data.version.published?.promotedFrom ===
			doc.data?.data.versionId
		)
			return false;

		// Fallback, if the document has been mutated and not saved
		return !brickStore.get.documentMutated && !isSaving() && !mutateErrors();
	});
	const isBuilderLocked = createMemo(() => {
		// lock builder if collection is locked
		if (collection.data?.data.isLocked === true) {
			return true;
		}

		// lock published version, if in edit mode and the collection supports drafts
		if (props.version === "published") {
			if (props.mode === "edit") {
				return collection.data?.data.useDrafts ?? false;
			}
		}

		// builder not locked
		return false;
	});
	const isPublished = createMemo(() => {
		return (
			doc.data?.data.version?.published?.id !== null &&
			doc.data?.data.version?.published?.id !== undefined
		);
	});

	// ---------------------------------
	// Functions
	const upsertDocumentAction = async () => {
		if (props.mode === "create") {
			createDocument.action.mutate({
				collectionKey: collectionKey(),
				body: {
					publish: props.version === "published",
					bricks: brickHelpers.getUpsertBricks(),
					fields: brickHelpers.getCollectionPseudoBrickFields(),
				},
			});
		} else {
			updateSingle.action.mutate({
				collectionKey: collectionKey(),
				documentId: documentId() as number,
				body: {
					publish: props.version === "published",
					bricks: brickHelpers.getUpsertBricks(),
					fields: brickHelpers.getCollectionPseudoBrickFields(),
				},
			});
		}
	};
	const publishDocumentAction = async () => {
		if (!doc.data?.data.version?.draft?.id) {
			console.error("No draft version ID found.");
		}
		promoteToPublished.action.mutate({
			collectionKey: collectionKey(),
			id: documentId() as number,
			versionId: doc.data?.data.version?.draft?.id as number,
			body: {
				versionType: "published",
			},
		});
	};
	const setDocumentState = () => {
		brickStore.get.reset();
		brickStore.set(
			"collectionTranslations",
			collection.data?.data.useTranslations || false,
		);
		brickStore.get.setBricks(doc.data?.data, collection.data?.data);
		brickStore.set("locked", isBuilderLocked());
	};

	// ---------------------------------
	// Effects
	createEffect(
		on(
			() => doc.data,
			() => {
				setDocumentState();
			},
		),
	);
	createEffect(
		on(
			() => collection.isSuccess,
			() => {
				setDocumentState();
			},
		),
	);

	// ----------------------------------
	// Render
	return (
		<Switch>
			<Match when={isLoading()}>
				<div class="fixed top-15 left-[325px] bottom-15 right-15 flex flex-col">
					<span class="h-32 w-full skeleton block mb-15" />
					<span class="h-full w-full skeleton block" />
				</div>
			</Match>
			<Match when={isSuccess()}>
				<Document.HeaderLayout
					state={{
						mode: props.mode,
						version: props.version,
						collectionKey: collectionKey,
						documentId: documentId,
						collection: collection.data?.data,
						brickTranslationErrors: brickTranslationErrors,
						canSaveDocument: canSaveDocument,
						canPublishDocument: canPublishDocument,
						panelOpen: getPanelOpen,
						isPublished: isPublished,
						isBuilderLocked: isBuilderLocked,
					}}
					actions={{
						upsertDocumentAction: upsertDocumentAction,
						setPanelOpen: setPanelOpen,
						setDeleteOpen: setDeleteOpen,
						publishDocumentAction: publishDocumentAction,
					}}
				>
					<Show when={isBuilderLocked()}>
						<Alert
							style="layout"
							alerts={[
								{
									type: "warning",
									message: T()("locked_document_message"),
									show: isBuilderLocked(),
								},
							]}
						/>
					</Show>
					<div class="w-full flex flex-grow">
						{/* Fields & Bricks */}
						<div class="w-full flex flex-col">
							<Document.CollectionPseudoBrick
								fields={collection.data?.data.fields || []}
							/>
							<Document.FixedBricks
								brickConfig={collection.data?.data.fixedBricks || []}
							/>
							<Document.BuilderBricks
								brickConfig={collection.data?.data.builderBricks || []}
							/>
						</div>
						{/* Sidebar */}
						<Show when={props.mode === "edit"}>
							<aside
								class={classNames(
									"w-full lg:max-w-[300px] lg:overflow-y-auto bg-container-5 border-b lg:border-b-0 lg:border-l border-border animate-animate-slide-from-right-in",
									{
										hidden: getPanelOpen() === false,
									},
								)}
							>
								<div class="p-15 md:p-30">
									<h3 class="mb-15">{T()("metadata")}</h3>
									<DetailsList
										type="text"
										items={[
											{
												label: T()("collection"),
												value: collection.data?.data.title,
											},
											{
												label: T()("document_id"),
												value: doc.data?.data.id,
											},
											{
												label: T()("fixed_bricks"),
												value: collection.data?.data.fixedBricks?.length,
											},
											{
												label: T()("available_builder_bricks"),
												value: collection.data?.data.builderBricks?.length,
											},
											{
												label: T()("total_bricks"),
												value: brickStore.get.bricks.length,
											},
											{
												label: T()("field_errors"),
												value: (
													<Pill
														theme={
															brickStore.get.fieldsErrors?.length > 0
																? "red"
																: "grey"
														}
													>
														{`${brickStore.get.fieldsErrors?.length || 0}`}
													</Pill>
												),
											},
											{
												label: T()("created_at"),
												value: <DateText date={doc.data?.data.createdAt} />,
												show: props.mode === "edit",
											},
											{
												label: T()("created_by"),
												value: (
													<UserDisplay
														user={{
															username: doc.data?.data.createdBy?.username,
															firstName: doc.data?.data.createdBy?.firstName,
															lastName: doc.data?.data.createdBy?.lastName,
															thumbnail: undefined,
														}}
														mode="long"
													/>
												),
												stacked: true,
												show: props.mode === "edit",
											},
											{
												label: T()("last_updated_at"),
												value: <DateText date={doc.data?.data.updatedAt} />,
												show: props.mode === "edit",
											},
											{
												label: T()("last_updated_by"),
												value: (
													<UserDisplay
														user={{
															username: doc.data?.data.updatedBy?.username,
															firstName: doc.data?.data.updatedBy?.firstName,
															lastName: doc.data?.data.updatedBy?.lastName,
															thumbnail: undefined,
														}}
														mode="long"
													/>
												),
												stacked: true,
												show: props.mode === "edit",
											},
										]}
									/>
								</div>
							</aside>
						</Show>
					</div>
				</Document.HeaderLayout>
				{/* Modals */}
				<NavigationGuard
					state={{
						open: navGuard.getModalOpen(),
						setOpen: navGuard.setModalOpen,
						targetElement: navGuard.getTargetElement(),
						targetCallback: navGuard.getTargetCallback(),
					}}
				/>
				<MediaSelectModal />
				<DocumentSelectModal />
				<LinkSelectModal />
				<BrickImagePreview />
				<DeleteDocument
					id={doc.data?.data.id}
					state={{
						open: getDeleteOpen(),
						setOpen: setDeleteOpen,
					}}
					collection={collection.data?.data as CollectionResponse}
					callbacks={{
						onSuccess: () => {
							navigate(`/admin/collections/${collection.data?.data.key}`);
						},
					}}
				/>
				<Show when={isSaving()}>
					<div class="fixed inset-0 bg-black bg-opacity-60 animate-pulse z-50" />
				</Show>
			</Match>
		</Switch>
	);
};

export default CollectionsDocumentsEditRoute;
