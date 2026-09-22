import { useParams } from "@solidjs/router";
import { type Component, createMemo, Match, Switch } from "solid-js";
import ErrorState from "@/components/ErrorState/ErrorState";
import CollectionDocumentPageBuilderRoute from "@/containers/DocumentEditorPage/DocumentEditorPage";
import api from "@/services/api";
import T from "@/translations";

const ReleaseRequestDetailPage: Component = () => {
	// ----------------------------------
	// State
	const params = useParams();

	// ----------------------------------
	// Queries
	const requestId = createMemo(() =>
		Number.parseInt(params.releaseRequestId ?? "", 10),
	);
	const request = api.publishOperations.useGetSingle({
		queryParams: {
			location: {
				id: () => requestId(),
			},
		},
		enabled: () => Number.isFinite(requestId()),
	});

	// ----------------------------------
	// Memos
	const releaseRequest = createMemo(() => request.data?.data);
	const snapshotVersionId = createMemo(
		() => releaseRequest()?.snapshotVersionId,
	);

	// ----------------------------------
	// Render
	return (
		<Switch>
			<Match when={request.isLoading}>
				<div class="-mt-4 relative bg-background rounded-b-xl border border-border h-36">
					<span class="absolute inset-4 bg-background-hover z-5 skeleton" />
				</div>
				<div class="mt-2 bg-background rounded-t-xl border border-border grow overflow-hidden relative">
					<div class="absolute top-4 left-4 bottom-4 right-4 flex flex-col z-10">
						<span class="h-62 w-full skeleton block mb-4" />
						<span class="h-full w-full skeleton block" />
					</div>
				</div>
			</Match>
			<Match when={request.isError}>
				<ErrorState
					title={T()("errors.generic.title")}
					description={request.error?.message ?? T()("errors.generic.message")}
				/>
			</Match>
			<Match when={releaseRequest()}>
				<CollectionDocumentPageBuilderRoute
					mode="edit"
					version="snapshot"
					versionId={snapshotVersionId}
					releaseRequest={releaseRequest}
				/>
			</Match>
		</Switch>
	);
};

export default ReleaseRequestDetailPage;
