import { useParams } from "@solidjs/router";
import { type Component, createMemo, Show } from "solid-js";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import DocumentEditorPage from "@/containers/DocumentEditorPage/DocumentEditorPage";
import api from "@/services/api";

/** Opens the content a release owns for one document. Proposals are editable and snapshots are read only. */
const ReleaseContentPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const params = useParams();

	// ----------------------------------------
	// Queries & Mutations
	const query = api.releases.useGetSingle({
		queryParams: {
			location: { id: () => Number(params.releaseId) || undefined },
		},
	});

	// ----------------------------------------
	// Memos
	const release = createMemo(() => query.data?.data);
	const document = createMemo(() =>
		release()?.documents.find(
			(document) =>
				document.collectionKey === params.collectionKey &&
				document.documentId === Number(params.documentId),
		),
	);
	//* proposals are removed once released, so a released proposal opens its approved snapshot
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
		<QueryBoundary
			loading={query.isLoading}
			error={query.isError}
			empty={query.isSuccess && !content()?.versionId}
		>
			<Show when={content()?.versionId}>
				{(versionId) => (
					<DocumentEditorPage
						mode="edit"
						version={content()?.type}
						versionId={versionId}
						release={release}
						releaseDocument={document}
					/>
				)}
			</Show>
		</QueryBoundary>
	);
};

export default ReleaseContentPage;
