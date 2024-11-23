import T from "@/translations";
import {
	type Component,
	createEffect,
	createMemo,
	Switch,
	Match,
	on,
	Show,
} from "solid-js";
import helpers from "@/utils/helpers";
import { useNavigate, useParams } from "@solidjs/router";
import useSearchParamsState from "@/hooks/useSearchParamsState";
import contentLocaleStore from "@/store/contentLocaleStore";
import { getDocumentRoute } from "@/utils/route-helpers";
import api from "@/services/api";
import brickStore from "@/store/brickStore";
import Document from "@/components/Groups/Document";
import Alert from "@/components/Blocks/Alert";
import Link from "@/components/Partials/Link";

const CollectionsDocumentsRevisionsRoute: Component = (props) => {
	// ----------------------------------
	// Hooks & State
	const params = useParams();
	const navigate = useNavigate();
	const revisionsSearchParams = useSearchParamsState(
		{
			sorts: {
				createdAt: "desc",
			},
			pagination: {
				perPage: 6,
			},
		},
		{
			singleSort: true,
		},
	);

	// ----------------------------------
	// Memos
	const collectionKey = createMemo(() => params.collectionKey);
	const documentId = createMemo(
		() => Number.parseInt(params.documentId) || undefined,
	);
	const versionIdParam = createMemo(() => params.versionId);
	const versionId = createMemo(() => {
		if (versionIdParam() !== "latest") return Number.parseInt(versionIdParam());
		return undefined;
	});
	const contentLocale = createMemo(() => contentLocaleStore.get.contentLocale);
	const canFetchRevisions = createMemo(() => {
		return (
			contentLocale() !== undefined &&
			documentId() !== undefined &&
			revisionsSearchParams.getSettled()
		);
	});
	const canFetchRevisionDocument = createMemo(() => {
		return (
			contentLocale() !== undefined &&
			documentId() !== undefined &&
			versionId() !== undefined
		);
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
	const revisionDoc = api.collections.document.useGetSingleVersion({
		queryParams: {
			location: {
				collectionKey: collectionKey,
				id: documentId,
				versionId: versionId,
			},
			include: {
				bricks: true,
			},
		},
		enabled: () => canFetchRevisionDocument(),
		refetchOnWindowFocus: false,
	});
	const revisionVersions = api.collections.document.useGetMultipleRevisions({
		queryParams: {
			queryString: revisionsSearchParams.getQueryString,
			location: {
				collectionKey: collectionKey,
				documentId: documentId,
			},
		},
		enabled: () => canFetchRevisions(),
		refetchOnWindowFocus: false,
	});

	// ----------------------------------
	// Fallback document
	const canFetchFallbackDocument = createMemo(() => {
		if (versionId() !== undefined) return false;
		if (collection.isFetched === false) return false;

		return (
			contentLocale() !== undefined &&
			documentId() !== undefined &&
			collection.data?.data.config.useDrafts !== undefined
		);
	});
	const fallbackVersionType = createMemo(() => {
		return collection.data?.data.config.useDrafts ? "draft" : "published";
	});

	const fallbackDoc = api.collections.document.useGetSingle({
		queryParams: {
			location: {
				collectionKey: collectionKey,
				id: documentId,
				version: fallbackVersionType,
			},
			include: {
				bricks: true,
			},
		},
		enabled: () => canFetchFallbackDocument(),
		refetchOnWindowFocus: false,
	});

	// ----------------------------------
	// Mutations
	const restoreRevision = api.collections.document.useRestoreRevision({
		onSuccess: () => {
			brickStore.set("fieldsErrors", []);
			brickStore.set("documentMutated", false);

			navigate(
				getDocumentRoute("edit", {
					collectionKey: collectionKey(),
					useDrafts: collection.data?.data.config.useDrafts,
					documentId: documentId(),
				}),
			);
		},
		onError: () => {
			brickStore.set("fieldsErrors", []);
			brickStore.set("documentMutated", false);
		},
		getCollectionName: () =>
			helpers.getLocaleValue({
				value: collection.data?.data.details.singularName,
			}) || T()("collection"),
	});

	// ----------------------------------
	// Memos
	const doc = createMemo(() => {
		return canFetchRevisionDocument() ? revisionDoc : fallbackDoc;
	});
	const documentIsLoading = createMemo(() => {
		if (versionIdParam() === "latest") {
			return collection.isLoading || revisionVersions.isLoading;
		}
		return collection.isLoading || doc().isLoading;
	});
	const documentIsSuccess = createMemo(() => {
		if (versionIdParam() === "latest") {
			return collection.isSuccess && revisionVersions.isSuccess;
		}
		return collection.isSuccess && doc().isSuccess;
	});
	const revisionsIsLoading = createMemo(() => {
		return revisionVersions.isLoading;
	});
	const revisionsIsSuccess = createMemo(() => {
		return revisionVersions.isSuccess;
	});
	const anyIsError = createMemo(() => {
		return revisionVersions.isError || collection.isError || doc().isError;
	});
	const isPublished = createMemo(() => {
		return (
			doc().data?.data.version?.published?.id !== null &&
			doc().data?.data.version?.published?.id !== undefined
		);
	});

	// ---------------------------------
	// Functions
	const setDocumentState = () => {
		brickStore.get.reset();
		brickStore.set(
			"collectionTranslations",
			collection.data?.data.config.useTranslations || false,
		);
		brickStore.get.setBricks(doc().data?.data, collection.data?.data);
		brickStore.set("locked", true);
	};
	const restoreRevisionAction = () => {
		const vId = versionId();
		if (vId === undefined) {
			console.error("No version ID found.");
		}
		restoreRevision.action.mutate({
			collectionKey: collectionKey(),
			id: documentId() as number,
			versionId: vId as number,
		});
	};

	// ---------------------------------
	// Effects
	createEffect(() => {
		if (versionIdParam() === "latest") {
			const latestVersion = revisionVersions.data?.data[0];
			if (latestVersion) {
				navigate(
					`/admin/collections/${collectionKey()}/revisions/${documentId()}/${latestVersion.id}`,
				);
			}
		}
	});

	createEffect(
		on(
			() => doc().data,
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
			<Match when={documentIsLoading()}>
				<div class="fixed top-15 left-[325px] bottom-15 right-15 flex flex-col">
					<span class="h-32 w-full skeleton block mb-15" />
					<span class="h-full w-full skeleton block" />
				</div>
			</Match>
			<Match when={documentIsSuccess()}>
				<Document.HeaderLayout
					state={{
						mode: "revisions",
						collectionKey: collectionKey,
						documentId: documentId,
						isPublished: isPublished,
						collection: collection.data?.data,
						selectedRevision: versionId,
					}}
					actions={{
						restoreRevisionAction: restoreRevisionAction,
					}}
				>
					<Show when={!revisionDoc.data}>
						<div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 flex-col z-20">
							<div class="w-full max-w-xl px-15 py-15 text-center flex flex-col items-center">
								<h2 class="mb-2.5">{T()("no_revisions_found")}</h2>
								<p class="mb-30">{T()("no_revisions_found_message")}</p>
								<Link
									href={getDocumentRoute("edit", {
										collectionKey: collectionKey(),
										useDrafts: collection.data?.data.config.useDrafts,
										documentId: documentId(),
									})}
									theme="primary"
									size="medium"
								>
									{T()("back_to_document")}
								</Link>
							</div>
						</div>
					</Show>
					<Alert
						style="layout"
						alerts={[
							{
								type: "warning",
								message: T()("locked_document_message"),
								show: true,
							},
						]}
					/>
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
						<Document.RevisionsSidebar
							state={{
								revisions: revisionVersions.data?.data || [],
								meta: revisionVersions.data?.meta,
								versionId: versionId,
								collectionKey: collectionKey,
								documentId: documentId,
								searchParams: revisionsSearchParams,
								isLoading: revisionsIsLoading,
								isError: anyIsError,
								isSuccess: revisionsIsSuccess,
								hideNoEntries: versionIdParam() === "latest",
							}}
						/>
					</div>
				</Document.HeaderLayout>
			</Match>
		</Switch>
	);
};

export default CollectionsDocumentsRevisionsRoute;
