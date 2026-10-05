import { useNavigate } from "@solidjs/router";
import type {
	InternalCollectionDocument,
	Release,
	ReleaseDocumentInput,
} from "@types";
import { FaSolidPlus } from "solid-icons/fa";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import DocumentSelectDrawer from "@/components/DocumentSelectDrawer/DocumentSelectDrawer";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import { FormLabel } from "@/components/FormLabel/FormLabel";
import Input from "@/components/Input/Input";
import Modal from "@/components/Modal/Modal";
import { releaseDocumentLimit } from "@/constants/releases";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import { getAllowedTargets } from "@/utils/releases";
import { getReleaseRoute } from "@/utils/route-helpers";
import ReleaseDocumentDraft from "./parts/ReleaseDocumentDraft";

/**
 * Creates a release, or adds documents to an existing one. Documents are
 * picked in one go and each keeps its own starting version and targets,
 * editable in place before saving.
 */
const ReleaseCreateModal: Component<{
	open: boolean;
	setOpen: (open: boolean) => void;
	/** Adds to this release instead of creating a new one. */
	release?: Release;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const navigate = useNavigate();
	const [title, setTitle] = createSignal("");
	const [drafts, setDrafts] = createSignal<ReleaseDocumentInput[]>([]);
	//* picked documents, keyed by collection and ID, so drafts need no requests of their own
	const [records, setRecords] = createSignal<
		Map<string, InternalCollectionDocument>
	>(new Map());
	const [pickerOpen, setPickerOpen] = createSignal(false);
	const [skipped, setSkipped] = createSignal(false);
	const [overLimit, setOverLimit] = createSignal(false);

	// ----------------------------------------
	// Queries & Mutations
	//* fields are needed to label each document by its title field
	const collections = api.collections.useGetAll({
		queryParams: { include: { fields: true } },
		enabled: () => props.open,
	});
	const create = api.releases.useCreateSingle({
		onSuccess: (response) => {
			props.setOpen(false);
			navigate(getReleaseRoute({ releaseId: response.data.id }));
		},
	});
	const add = api.releases.useAddDocuments({
		onSuccess: () => props.setOpen(false),
	});

	// ----------------------------------------
	// Memos
	const collectionFor = (key: string) =>
		collections.data?.data.find((collection) => collection.key === key);
	const collectionKeys = createMemo(() =>
		(collections.data?.data ?? [])
			.filter(
				(collection) =>
					collection.publishing.targets.length > 0 &&
					userStore.get.hasPermission([
						collection.permissions.read,
						collection.permissions.update,
					]).all,
			)
			.map((collection) => collection.key),
	);
	const documentCount = createMemo(
		() => (props.release?.documents.length ?? 0) + drafts().length,
	);
	const ready = createMemo(
		() =>
			drafts().length > 0 &&
			documentCount() <= releaseDocumentLimit &&
			drafts().every((draft) => draft.targets.length > 0) &&
			(props.release !== undefined || title().trim().length > 0),
	);

	// ----------------------------------------
	// Functions
	const isIncluded = (collectionKey: string, documentId: number) =>
		[...(props.release?.documents ?? []), ...drafts()].some(
			(member) =>
				member.collectionKey === collectionKey &&
				member.documentId === documentId,
		);
	const refKey = (collectionKey: string, documentId: number) =>
		`${collectionKey}:${documentId}`;
	const updateDraft = (index: number, draft: ReleaseDocumentInput) =>
		setDrafts((current) =>
			current.map((item, itemIndex) => (itemIndex === index ? draft : item)),
		);
	const submit = () => {
		if (!ready()) return;
		if (props.release) {
			add.action.mutate({
				id: props.release.id,
				body: { documents: drafts() },
			});
			return;
		}

		create.action.mutate({ body: { title: title(), documents: drafts() } });
	};

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!props.open) return;
		setTitle("");
		setDrafts([]);
		setRecords(new Map());
		setPickerOpen(false);
		setSkipped(false);
		setOverLimit(false);
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
							{T()(
								props.release
									? "releases.documents.add"
									: "releases.create.title",
							)}
						</Modal.Title>
						<Modal.Description>
							{T()(
								props.release?.approved
									? "releases.documents.add.approved"
									: props.release
										? "releases.documents.add.description"
										: "releases.create.description",
							)}
						</Modal.Description>
					</Modal.Header>
					<Modal.Body>
						<div class="grid gap-4">
							<Show when={!props.release}>
								<Input
									id="release-title"
									name="title"
									type="text"
									value={title()}
									onChange={setTitle}
									required={true}
									label={T()("releases.title.label")}
								/>
							</Show>
							<div>
								<FormLabel
									id="release-documents"
									label={T()("releases.documents")}
									theme="basic"
								/>
								<Show when={drafts().length > 0}>
									<ul class="mb-3 grid gap-2">
										<For each={drafts()}>
											{(draft, index) => (
												<ReleaseDocumentDraft
													draft={draft}
													document={records().get(
														refKey(draft.collectionKey, draft.documentId),
													)}
													collection={collectionFor(draft.collectionKey)}
													onChange={(next) => updateDraft(index(), next)}
													onRemove={() =>
														setDrafts((current) =>
															current.filter(
																(_, itemIndex) => itemIndex !== index(),
															),
														)
													}
												/>
											)}
										</For>
									</ul>
								</Show>
								<Show when={documentCount() < releaseDocumentLimit}>
									<button
										type="button"
										class="flex h-20 w-full items-center justify-center gap-2 rounded-md border border-dashed border-border bg-input/40 text-sm text-muted transition-colors hover:border-primary/60 hover:bg-input hover:text-body focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
										onClick={() => setPickerOpen(true)}
									>
										<FaSolidPlus size={12} />
										{T()("releases.documents.select")}
									</button>
								</Show>
								<Show when={skipped()}>
									<p class="mt-3 text-sm text-danger">
										{T()("releases.documents.duplicate")}
									</p>
								</Show>
								<Show when={overLimit()}>
									<p class="mt-3 text-sm text-danger">
										{T()("releases.documents.limit", {
											limit: releaseDocumentLimit,
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
								{T()(
									props.release ? "releases.documents.add" : "common.create",
								)}
							</Button>
						</Modal.Actions>
					</Modal.Footer>
				</form>
			</Modal.Root>
			<DocumentSelectDrawer
				state={{
					open: props.open && pickerOpen(),
					setOpen: setPickerOpen,
					multiple: true,
					collectionKeys: collectionKeys(),
					disabledDocuments: [
						...(props.release?.documents ?? []),
						...drafts(),
					].map((member) => ({
						id: member.documentId,
						collectionKey: member.collectionKey,
					})),
				}}
				callbacks={{
					onSelect: (selection) => {
						const unique = selection.value.filter(
							(selected) => !isIncluded(selected.collectionKey, selected.id),
						);
						setSkipped(unique.length < selection.value.length);
						//* the picker has no limit of its own, so keep only what the release can still hold
						const room = releaseDocumentLimit - documentCount();
						const fresh = unique.slice(0, Math.max(room, 0));
						setOverLimit(fresh.length < unique.length);
						setRecords((current) => {
							const next = new Map(current);
							for (const document of selection.documents) {
								next.set(refKey(document.collectionKey, document.id), document);
							}
							return next;
						});
						setDrafts((current) => [
							...current,
							...fresh.map((selected) => ({
								collectionKey: selected.collectionKey,
								documentId: selected.id,
								source: "latest",
								targets: getAllowedTargets(
									collectionFor(selected.collectionKey),
									"latest",
								).slice(0, 1),
							})),
						]);
						setPickerOpen(false);
					},
				}}
			/>
		</>
	);
};

export default ReleaseCreateModal;
