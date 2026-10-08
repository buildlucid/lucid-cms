import { useNavigate } from "@solidjs/router";
import type {
	Collection,
	InternalCollectionDocument,
	RequestDetail,
	RequestDocumentInput,
	RequestType,
} from "@types";
import {
	createEffect,
	createMemo,
	createSignal,
	For,
	type JSXElement,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import DocumentSelectDrawer from "@/components/DocumentSelectDrawer/DocumentSelectDrawer";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import { FormLabel } from "@/components/FormLabel/FormLabel";
import Input from "@/components/Input/Input";
import Modal from "@/components/Modal/Modal";
import { requestDocumentLimit } from "@/constants/requests";
import api from "@/services/api";
import T from "@/translations";
import { getRequestRoute } from "@/utils/route-helpers";

const RequestDocumentsModal = <TDraft extends RequestDocumentInput>(props: {
	open: boolean;
	setOpen: (open: boolean) => void;
	type: Exclude<RequestType, "create">;
	request?: RequestDetail;
	copy: { title: string; description: string };
	canPick: (collection: Collection) => boolean;
	toDraft: (
		document: InternalCollectionDocument | undefined,
		collection: Collection | undefined,
		ref: { collectionKey: string; documentId: number },
	) => TDraft | null;
	isReady: (draft: TDraft) => boolean;
	unavailable?: string;
	renderDraft: (draft: {
		draft: TDraft;
		document: InternalCollectionDocument | undefined;
		collection: Collection | undefined;
		onChange: (draft: TDraft) => void;
		onRemove: () => void;
	}) => JSXElement;
}): JSXElement => {
	// ----------------------------------------
	// State & Hooks
	const navigate = useNavigate();
	const [title, setTitle] = createSignal("");
	const [drafts, setDrafts] = createSignal<TDraft[]>([]);
	//* picked documents, keyed by collection and ID, so drafts need no requests of their own
	const [records, setRecords] = createSignal<
		Map<string, InternalCollectionDocument>
	>(new Map());
	const [pickerOpen, setPickerOpen] = createSignal(false);
	const [skipped, setSkipped] = createSignal(false);
	const [overLimit, setOverLimit] = createSignal(false);
	const [leftOut, setLeftOut] = createSignal(false);

	// ----------------------------------------
	// Queries & Mutations
	//* fields are needed to label each document by its title field
	const collections = api.collections.useGetAll({
		queryParams: { include: { fields: true } },
		enabled: () => props.open,
	});
	const create = api.requests.useCreateSingle({
		onSuccess: (response) => {
			props.setOpen(false);
			navigate(getRequestRoute({ requestId: response.data.id }));
		},
	});
	const add = api.requests.useAddDocuments({
		onSuccess: () => props.setOpen(false),
	});

	// ----------------------------------------
	// Memos
	const collectionFor = (key: string) =>
		collections.data?.data.find((collection) => collection.key === key);
	const collectionKeys = createMemo(() =>
		(collections.data?.data ?? [])
			.filter((collection) => props.canPick(collection))
			.map((collection) => collection.key),
	);
	const documentCount = createMemo(
		() => (props.request?.documents.length ?? 0) + drafts().length,
	);
	const ready = createMemo(
		() =>
			drafts().length > 0 &&
			documentCount() <= requestDocumentLimit &&
			drafts().every((draft) => props.isReady(draft)) &&
			(props.request !== undefined || title().trim().length > 0),
	);

	// ----------------------------------------
	// Functions
	const isIncluded = (collectionKey: string, documentId: number) =>
		[...(props.request?.documents ?? []), ...drafts()].some(
			(member) =>
				member.collectionKey === collectionKey &&
				member.documentId === documentId,
		);
	const refKey = (collectionKey: string, documentId: number) =>
		`${collectionKey}:${documentId}`;
	const updateDraft = (index: number, draft: TDraft) =>
		setDrafts((current) =>
			current.map((item, itemIndex) => (itemIndex === index ? draft : item)),
		);
	const submit = () => {
		if (!ready()) return;
		if (props.request) {
			add.action.mutate({
				id: props.request.id,
				body: { documents: drafts() },
			});
			return;
		}

		create.action.mutate({
			body: { type: props.type, title: title(), documents: drafts() },
		});
	};

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!props.open) return;
		setTitle("");
		setDrafts([]);
		setRecords(new Map());
		//* adding to a request starts with the picker, as there's nothing else to fill in first
		setPickerOpen(props.request !== undefined);
		setSkipped(false);
		setOverLimit(false);
		setLeftOut(false);
		create.reset();
		add.reset();
	});

	// ----------------------------------------
	// Render
	return (
		<>
			<Modal.Root
				open={props.open && !pickerOpen()}
				onOpenChange={props.setOpen}
			>
				<form
					class="w-full"
					onSubmit={(event) => {
						event.preventDefault();
						submit();
					}}
				>
					<Modal.Header>
						<Modal.Title>
							{props.request ? T()("requests.documents.add") : props.copy.title}
						</Modal.Title>
						<Modal.Description>
							{props.request?.approved
								? T()("requests.documents.add.approved")
								: props.request
									? T()("requests.documents.add.description")
									: props.copy.description}
						</Modal.Description>
					</Modal.Header>
					<Modal.Body>
						<div class="grid gap-4">
							<Show when={!props.request}>
								<Input
									id="request-title"
									name="title"
									type="text"
									value={title()}
									onChange={setTitle}
									required={true}
									label={T()("requests.title.label")}
								/>
							</Show>
							<div>
								<FormLabel
									id="request-documents"
									label={T()("requests.documents")}
									theme="basic"
								/>
								<Show when={drafts().length > 0}>
									<ul class="mb-3 grid gap-2">
										<For each={drafts()}>
											{(draft, index) =>
												props.renderDraft({
													draft,
													document: records().get(
														refKey(draft.collectionKey, draft.documentId),
													),
													collection: collectionFor(draft.collectionKey),
													onChange: (next) => updateDraft(index(), next),
													onRemove: () =>
														setDrafts((current) =>
															current.filter(
																(_, itemIndex) => itemIndex !== index(),
															),
														),
												})
											}
										</For>
									</ul>
								</Show>
								<Show when={documentCount() < requestDocumentLimit}>
									<Button
										variant="outline"
										size="md"
										class="w-fit"
										onClick={() => setPickerOpen(true)}
									>
										{T()("requests.documents.select")}
									</Button>
								</Show>
								<Show when={skipped()}>
									<p class="mt-3 text-sm text-danger">
										{T()("requests.documents.duplicate")}
									</p>
								</Show>
								<Show when={leftOut() && props.unavailable}>
									<p class="mt-3 text-sm text-danger">{props.unavailable}</p>
								</Show>
								<Show when={overLimit()}>
									<p class="mt-3 text-sm text-danger">
										{T()("requests.documents.limit", {
											limit: requestDocumentLimit,
										})}
									</p>
								</Show>
							</div>
						</div>
					</Modal.Body>
					<Modal.Footer>
						<ErrorMessage
							theme="basic"
							message={add.errors()?.message ?? create.errors()?.message}
						/>
						<Modal.Actions>
							<Button variant="outline" onClick={() => props.setOpen(false)}>
								{T()("common.cancel")}
							</Button>
							<Button
								type="submit"
								loading={create.action.isPending || add.action.isPending}
								disabled={!ready()}
							>
								{props.request
									? T()("requests.documents.add")
									: T()("common.create")}
							</Button>
						</Modal.Actions>
					</Modal.Footer>
				</form>
			</Modal.Root>
			<DocumentSelectDrawer
				state={{
					open: props.open && pickerOpen(),
					setOpen: (open) => {
						setPickerOpen(open);
						if (!open && props.request && drafts().length === 0) {
							props.setOpen(false);
						}
					},
					multiple: true,
					collectionKeys: collectionKeys(),
					disabledDocuments: [
						...(props.request?.documents ?? []),
						...drafts(),
					].map((member) => ({
						id: member.documentId,
						collectionKey: member.collectionKey,
					})),
				}}
				callbacks={{
					onSelect: (selection) => {
						const picked = new Map(
							selection.documents.map((document) => [
								refKey(document.collectionKey, document.id),
								document,
							]),
						);
						const unique = selection.value.filter(
							(selected) => !isIncluded(selected.collectionKey, selected.id),
						);
						setSkipped(unique.length < selection.value.length);
						const fresh = unique.flatMap((selected) => {
							const draft = props.toDraft(
								picked.get(refKey(selected.collectionKey, selected.id)),
								collectionFor(selected.collectionKey),
								{
									collectionKey: selected.collectionKey,
									documentId: selected.id,
								},
							);
							return draft ? [draft] : [];
						});
						setLeftOut(fresh.length < unique.length);
						//* the picker has no limit of its own, so keep only what the request can still hold
						const room = Math.max(requestDocumentLimit - documentCount(), 0);
						setOverLimit(fresh.length > room);
						setRecords((current) => new Map([...current, ...picked]));
						setDrafts((current) => [...current, ...fresh.slice(0, room)]);
						setPickerOpen(false);
					},
				}}
			/>
		</>
	);
};

export default RequestDocumentsModal;
