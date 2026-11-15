import { useNavigate } from "@solidjs/router";
import type { Collection } from "@types";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Show,
	untrack,
} from "solid-js";
import Input from "@/components/Input/Input";
import Modal from "@/components/Modal/Modal";
import api from "@/services/api";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getDocumentCreateActions } from "@/utils/requests";
import { getDocumentRoute, getRequestRoute } from "@/utils/route-helpers";

interface DuplicateDocumentProps {
	id: Accessor<number | undefined> | number | undefined;
	collection: Collection;
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
}

/**
 * Copies a document's latest saved content into a new document and opens it. Collections that
 * review new documents, and people who can only request them, get a create request instead.
 */
const DuplicateDocumentModal: Component<DuplicateDocumentProps> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const navigate = useNavigate();
	const [title, setTitle] = createSignal("");

	// ----------------------------------------
	// Memos
	const collectionSingularName = createMemo(
		() =>
			helpers.getLocaleValue({
				value: props.collection?.details.labels.singular,
			}) || T()("common.document"),
	);
	const sourceId = createMemo(() =>
		typeof props.id === "function" ? props.id() : props.id,
	);
	const requesting = createMemo(
		() => getDocumentCreateActions(props.collection)[0] === "request",
	);

	// ----------------------------------------
	// Mutations
	const duplicateDocument = api.documents.useDuplicateSingle({
		onSuccess: (response) => {
			props.state.setOpen(false);
			const { id, requestId } = response.data;
			navigate(
				requestId === null
					? getDocumentRoute("edit", {
							collectionKey: props.collection.key,
							documentId: id,
						})
					: getRequestRoute({
							requestId,
							content: { collectionKey: props.collection.key, documentId: id },
						}),
			);
		},
		getCollectionName: collectionSingularName,
	});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!props.state.open) return;
		untrack(() =>
			setTitle(
				T()("modals.documents.duplicate.request.default", {
					name: collectionSingularName(),
					id: sourceId() ?? "",
				}),
			),
		);
	});

	// ------------------------------
	// Render
	return (
		<Modal.Confirm
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			title={T()("modals.documents.duplicate.title", {
				name: collectionSingularName(),
			})}
			description={T()(
				requesting()
					? "modals.documents.duplicate.request.description"
					: "modals.documents.duplicate.description",
				{ name: collectionSingularName().toLowerCase() },
			)}
			confirmLabel={
				requesting()
					? T()("requests.create")
					: T()("actions.with.collection", {
							action: T()("common.duplicate"),
							collectionSingle: collectionSingularName(),
						})
			}
			confirmVariant="primary"
			confirmDisabled={requesting() && !title().trim()}
			loading={duplicateDocument.action.isPending}
			error={duplicateDocument.errors()?.message}
			onConfirm={() => {
				const id = sourceId();
				if (!id) return console.error("No id provided");

				duplicateDocument.action.mutate({
					id,
					collectionKey: props.collection.key,
					body: requesting() ? { request: { title: title().trim() } } : {},
				});
			}}
			onCancel={() => {
				props.state.setOpen(false);
				duplicateDocument.reset();
			}}
		>
			<Show when={requesting()}>
				<Input
					id="duplicate-request-title"
					name="title"
					type="text"
					value={title()}
					onChange={setTitle}
					required={true}
					label={T()("requests.title.label")}
				/>
			</Show>
		</Modal.Confirm>
	);
};

export default DuplicateDocumentModal;
