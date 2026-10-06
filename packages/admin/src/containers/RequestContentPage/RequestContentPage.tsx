import { useParams } from "@solidjs/router";
import { type Component, createMemo, Show } from "solid-js";
import EmptyState from "@/components/EmptyState/EmptyState";
import Link from "@/components/Link/Link";
import PageLayout from "@/components/PageLayout/PageLayout";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import DocumentEditorPage from "@/containers/DocumentEditorPage/DocumentEditorPage";
import api from "@/services/api";
import T from "@/translations";
import { getRequestRoute } from "@/utils/route-helpers";

/**
 * Opens the content a request owns for one document. Proposals are editable
 * and snapshots are read only. Documents no longer in the request link back
 * to it.
 */
const RequestContentPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const params = useParams();

	// ----------------------------------------
	// Queries & Mutations
	const query = api.requests.useGetSingle({
		queryParams: {
			location: { id: () => Number(params.requestId) || undefined },
		},
	});

	// ----------------------------------------
	// Memos
	const request = createMemo(() => query.data?.data);
	const document = createMemo(() =>
		request()?.documents.find(
			(document) =>
				document.collectionKey === params.collectionKey &&
				document.documentId === Number(params.documentId),
		),
	);
	//* proposals are removed once completed, so a completed proposal opens its approved snapshot
	const content = createMemo(() => {
		const member = document();
		if (member?.versionId) {
			return {
				type: member.source === "latest" ? "proposal" : "snapshot",
				versionId: member.versionId,
			} as const;
		}
		if (member?.approvedVersionId) {
			return { type: "snapshot", versionId: member.approvedVersionId } as const;
		}
		return undefined;
	});

	// ----------------------------------------
	// Render
	return (
		<Show
			when={content()?.versionId}
			fallback={
				<PageLayout.Root>
					<PageLayout.Body class="rounded-t-xl">
						<QueryBoundary
							class="grow"
							loading={query.isLoading}
							error={query.isError}
							empty={true}
							emptyFallback={
								<EmptyState
									title={T()("requests.content.missing.title")}
									description={T()("requests.content.missing.description")}
									actions={
										<Link
											variant="primary"
											size="sm"
											href={getRequestRoute({
												requestId: Number(params.requestId),
											})}
										>
											{T()("requests.content.missing.back")}
										</Link>
									}
								/>
							}
						>
							{null}
						</QueryBoundary>
					</PageLayout.Body>
				</PageLayout.Root>
			}
		>
			{(versionId) => (
				<DocumentEditorPage
					mode="edit"
					version={content()?.type}
					versionId={versionId}
					request={request}
					requestDocument={document}
				/>
			)}
		</Show>
	);
};

export default RequestContentPage;
