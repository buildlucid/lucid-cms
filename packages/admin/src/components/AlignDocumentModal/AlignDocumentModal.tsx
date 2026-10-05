import type { InternalCollectionDocument } from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	onCleanup,
	Show,
	untrack,
} from "solid-js";
import Button from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import Modal from "@/components/Modal/Modal";
import Select from "@/components/Select/Select";
import api from "@/services/api";
import brickStore from "@/store/brickStore/brickStore";
import T from "@/translations";

export type AlignmentSource = { key: string; label: string; contentId: string };

/**
 * Replaces the open document's content with another version's, chosen from
 * the sources it can align with. Autosave is paused while it is open so a
 * pending save can't write the content being replaced.
 */
const AlignDocumentModal: Component<{
	open: boolean;
	setOpen: (open: boolean) => void;
	sources: AlignmentSource[];
	document: InternalCollectionDocument;
	destinationContentId: string | undefined;
	busy: boolean;
	retainsRevision: boolean;
	refetch: () => Promise<unknown>;
	onAligned: () => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	let pausedBeforeOpen = false;
	let hasPaused = false;
	let destinationContentId: string | undefined;
	let destinationVersionId: number | null = null;
	const [sourceKey, setSourceKey] = createSignal<string>();
	const [confirming, setConfirming] = createSignal(false);

	// ----------------------------------------
	// Mutations
	const align = api.documents.useAlign({
		onSuccess: () => {
			brickStore.get.captureInitialSnapshot();
			props.onAligned();
		},
	});

	// ----------------------------------------
	// Memos
	const source = createMemo(() =>
		props.sources.find((source) => source.key === sourceKey()),
	);

	// ----------------------------------------
	// Functions
	const confirm = async () => {
		const selected = source();
		if (
			!selected ||
			!destinationContentId ||
			destinationVersionId === null ||
			props.busy
		) {
			return;
		}
		setConfirming(true);
		try {
			await align.action.mutateAsync({
				collectionKey: props.document.collectionKey,
				documentId: props.document.id,
				versionId: destinationVersionId,
				body: {
					source: selected.key,
					sourceContentId: selected.contentId,
					destinationContentId,
				},
			});
			await props.refetch();
			props.setOpen(false);
		} catch {
			return;
		} finally {
			setConfirming(false);
		}
	};

	// ----------------------------------------
	// Effects
	createEffect(() => {
		const open = props.open;
		untrack(() => {
			if (open && !hasPaused) {
				pausedBeforeOpen = brickStore.get.autoSavePaused;
				hasPaused = true;
				brickStore.set("autoSavePaused", true);
				destinationContentId = props.destinationContentId;
				destinationVersionId = props.document.versionId;
				setSourceKey(props.sources[0]?.key);
				align.reset();
			} else if (!open && hasPaused) {
				brickStore.set("autoSavePaused", pausedBeforeOpen);
				hasPaused = false;
			}
		});
	});
	onCleanup(() => {
		if (hasPaused) brickStore.set("autoSavePaused", pausedBeforeOpen);
	});

	// ----------------------------------------
	// Render
	return (
		<Modal.Root
			open={props.open}
			onOpenChange={(open) => {
				if (!open && !confirming()) props.setOpen(false);
			}}
		>
			<Modal.Header>
				<Modal.Title>{T()("documents.align.title")}</Modal.Title>
				<Modal.Description>
					{T()("documents.align.description")}
				</Modal.Description>
			</Modal.Header>
			<Modal.Body>
				<Select
					id="align-source"
					name="align-source"
					label={T()("documents.align.source")}
					value={sourceKey()}
					options={props.sources.map((source) => ({
						value: source.key,
						label: source.label,
					}))}
					onChange={(value) => {
						if (typeof value === "string") setSourceKey(value);
					}}
				/>
				<Show when={props.retainsRevision}>
					<p class="mt-4 text-sm text-body">
						{T()("documents.align.revision")}
					</p>
				</Show>
			</Modal.Body>
			<Modal.Footer>
				<ErrorMessage theme="basic" message={align.errors()?.message} />
				<Modal.Actions>
					<Button
						variant="outline"
						disabled={confirming()}
						onClick={() => props.setOpen(false)}
					>
						{T()("common.cancel")}
					</Button>
					<Button
						disabled={
							props.busy ||
							!source() ||
							!destinationContentId ||
							destinationVersionId === null
						}
						loading={confirming()}
						onClick={() => void confirm()}
					>
						{T()("documents.align.confirm")}
					</Button>
				</Modal.Actions>
			</Modal.Footer>
		</Modal.Root>
	);
};

export default AlignDocumentModal;
