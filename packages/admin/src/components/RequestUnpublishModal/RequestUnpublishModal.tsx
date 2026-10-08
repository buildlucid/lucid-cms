import type {
	Collection,
	InternalCollectionDocument,
	RequestDetail,
} from "@types";
import { type Component, For } from "solid-js";
import Checkbox from "@/components/Checkbox/Checkbox";
import RequestDocumentDraft from "@/components/RequestDocumentsModal/parts/RequestDocumentDraft";
import RequestDocumentsModal from "@/components/RequestDocumentsModal/RequestDocumentsModal";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import { getTargetLabel } from "@/utils/requests";

type UnpublishDraft = {
	collectionKey: string;
	documentId: number;
	targets: string[];
};

const getPublished = (
	document: InternalCollectionDocument | undefined,
	collection: Collection | undefined,
) =>
	(collection?.publishing.targets ?? [])
		.filter((environment) => document?.versions[environment.key])
		.map((environment) => environment.key);

const RequestUnpublishModal: Component<{
	open: boolean;
	setOpen: (open: boolean) => void;
	request?: RequestDetail;
}> = (props) => (
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
			collection.publishing.targets.length > 0 &&
			userStore.get.hasPermission([collection.permissions.read]).all &&
			userStore.get.hasPermission([
				collection.permissions.update,
				collection.permissions["unpublish-request"],
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
					<div class="flex min-w-0 grow flex-wrap gap-2">
						<For each={getPublished(draft.document, draft.collection)}>
							{(target) => (
								<Checkbox
									id={`request-unpublish-${draft.draft.collectionKey}-${draft.draft.documentId}-${target}`}
									variant="button"
									label={getTargetLabel(draft.collection, target)}
									value={draft.draft.targets.includes(target)}
									onChange={(checked) =>
										draft.onChange({
											...draft.draft,
											targets: getPublished(
												draft.document,
												draft.collection,
											).filter((key) =>
												key === target
													? checked
													: draft.draft.targets.includes(key),
											),
										})
									}
								/>
							)}
						</For>
					</div>
				</div>
			</RequestDocumentDraft>
		)}
	/>
);

export default RequestUnpublishModal;
