import type {
	Collection,
	InternalCollectionDocument,
	RequestDetails,
} from "@types";
import type { Component } from "solid-js";
import RequestDocumentDraft from "@/components/RequestDocumentDraft/RequestDocumentDraft";
import RequestDocumentsModal from "@/components/RequestDocumentsModal/RequestDocumentsModal";
import RequestTargetCheckboxes from "@/components/RequestTargetCheckboxes/RequestTargetCheckboxes";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";

type UnpublishDraft = {
	collectionKey: string;
	documentId: number;
	targets: string[];
};

const getPublished = (
	document: InternalCollectionDocument | undefined,
	collection: Collection | undefined,
) =>
	(collection?.publishing.environments ?? [])
		.filter((environment) => document?.versions[environment.key])
		.map((environment) => environment.key);

/** Picks documents and the environments to unpublish them from, for a new request or the unpublish `request` passed in. */
const RequestUnpublishModal: Component<{
	open: boolean;
	setOpen: (open: boolean) => void;
	request?: RequestDetails;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<RequestDocumentsModal<UnpublishDraft>
			open={props.open}
			setOpen={props.setOpen}
			type="unpublish"
			request={props.request}
			copy={{
				title: T()("requests.create.unpublish.title"),
				description: T()("requests.create.unpublish.description"),
			}}
			canPick={(collection) =>
				collection.publishing.environments.length > 0 &&
				userStore.get.hasPermission([collection.permissions.read]).all &&
				userStore.get.hasPermission([
					collection.permissions.update,
					collection.permissions.unpublishRequest,
				]).some
			}
			toDraft={(document, collection, ref) => {
				const published = getPublished(document, collection);
				return published.length > 0 ? { ...ref, targets: published } : null;
			}}
			isReady={(draft) => draft.targets.length > 0}
			unavailable={T()("requests.documents.unpublished")}
			renderDraft={(draft) => (
				<RequestDocumentDraft
					draft={draft.draft}
					document={draft.document}
					collection={draft.collection}
					onRemove={draft.onRemove}
				>
					<div class="flex flex-col gap-2 border-t border-border px-3 py-2.5 sm:flex-row sm:items-start sm:gap-4">
						<span class="shrink-0 text-xs text-muted sm:w-28 sm:pt-2">
							{T()("requests.targets.unpublish")}
						</span>
						<RequestTargetCheckboxes
							id={`request-unpublish-${draft.draft.collectionKey}-${draft.draft.documentId}`}
							options={getPublished(draft.document, draft.collection)}
							value={draft.draft.targets}
							collection={draft.collection}
							onChange={(targets) =>
								draft.onChange({ ...draft.draft, targets })
							}
						/>
					</div>
				</RequestDocumentDraft>
			)}
		/>
	);
};

export default RequestUnpublishModal;
