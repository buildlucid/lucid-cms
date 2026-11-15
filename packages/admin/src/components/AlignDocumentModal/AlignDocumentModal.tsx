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
import Input from "@/components/Input/Input";
import Modal from "@/components/Modal/Modal";
import Select from "@/components/Select/Select";
import Tabs from "@/components/Tabs/Tabs";
import api from "@/services/api";
import brickStore from "@/store/brickStore/brickStore";
import T from "@/translations";
import { getChangeModes, type LatestAccess } from "@/utils/requests";

export type AlignmentSource = { key: string; label: string; contentId: string };

type AlignMode = ReturnType<typeof getChangeModes>[number];

/**
 * Aligns content with a selected version, pausing autosave while open. On latest, the New Request
 * tab creates and opens an update proposal. Proposal-only users see that tab alone.
 */
const AlignDocumentModal: Component<{
	open: boolean;
	setOpen: (open: boolean) => void;
	sources: AlignmentSource[];
	document: InternalCollectionDocument;
	destinationContentId: string | undefined;
	busy: boolean;
	retainsRevision: boolean;
	/** How the person changes latest, when latest is being aligned. Left out for proposals, which align straight away. */
	latestAccess?: LatestAccess;
	refetch: () => Promise<unknown>;
	onAligned: () => void;
	/** Opens the update request that proposes the alignment. */
	onProposed?: (requestId: number) => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	let pausedBeforeOpen = false;
	let hasPaused = false;
	let destinationContentId: string | undefined;
	let destinationVersionId: number | null = null;
	const [sourceKey, setSourceKey] = createSignal<string>();
	const [mode, setMode] = createSignal<AlignMode>("now");
	const [title, setTitle] = createSignal("");
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
	const modes = createMemo(() =>
		getChangeModes(props.latestAccess).map((value) => ({
			value,
			label:
				value === "now"
					? T()("documents.align.now")
					: T()("requests.mode.request"),
		})),
	);
	const proposing = createMemo(() => mode() === "request");
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
			const aligned = await align.action.mutateAsync({
				collectionKey: props.document.collectionKey,
				documentId: props.document.id,
				versionId: destinationVersionId,
				body: {
					source: selected.key,
					sourceContentId: selected.contentId,
					destinationContentId,
					request: proposing() ? { title: title().trim() } : undefined,
				},
			});
			props.setOpen(false);
			const requestId = aligned.data.requestId;
			if (requestId !== null) {
				props.onProposed?.(requestId);
				return;
			}
			await props.refetch();
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
				setMode(modes()[0]?.value ?? "now");
				setTitle(T()("documents.align.request.default"));
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
			above={
				<Show when={modes().length > 1}>
					<Tabs.Root
						stretch={true}
						value={mode()}
						onChange={(value) => setMode(value as AlignMode)}
						items={modes()}
					/>
				</Show>
			}
		>
			<Modal.Header>
				<Modal.Title>{T()("documents.align.title")}</Modal.Title>
				<Modal.Description>
					{proposing()
						? T()("documents.align.request.description")
						: T()("documents.align.description")}
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
				<Show when={proposing()}>
					<div class="mt-4">
						<Input
							id="align-request-title"
							name="title"
							type="text"
							value={title()}
							onChange={setTitle}
							required={true}
							label={T()("requests.title.label")}
						/>
					</div>
				</Show>
				<Show when={props.retainsRevision && !proposing()}>
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
							destinationVersionId === null ||
							(proposing() && !title().trim())
						}
						loading={confirming()}
						onClick={() => void confirm()}
					>
						{proposing()
							? T()("documents.propose.submit")
							: T()("documents.align.confirm")}
					</Button>
				</Modal.Actions>
			</Modal.Footer>
		</Modal.Root>
	);
};

export default AlignDocumentModal;
