import type { DocumentEditors } from "@types";
import {
	type Accessor,
	createEffect,
	createMemo,
	createSignal,
	on,
	onCleanup,
} from "solid-js";
import api from "@/services/api";
import { tabId } from "@/utils/tab-id";

//* the server forgets a tab 90 seconds after its last heartbeat, and hidden tabs may slow timers to once a minute
const heartbeatMs = 30_000;

/** Tracks this tab with 30-second heartbeats so only the document or proposal holder can edit, releasing its hold when the editor closes. */
export const useDocumentEditors = (props: {
	collectionKey: Accessor<string>;
	documentId: Accessor<number | undefined>;
	/** The request whose proposal is open, or null for latest. Moving to another lets go of the last one. */
	requestId: Accessor<number | null>;
	enabled: Accessor<boolean>;
}) => {
	// ----------------------------------------
	// State & Hooks
	const [editors, setEditors] = createSignal<DocumentEditors>();
	const [takingOver, setTakingOver] = createSignal(false);

	// ----------------------------------------
	// Memos
	const location = createMemo(
		() => {
			const documentId = props.documentId();
			if (!props.enabled() || documentId === undefined) return undefined;
			return {
				collectionKey: props.collectionKey(),
				documentId,
				requestId: props.requestId(),
				tabId,
			};
		},
		undefined,
		{
			equals: (previous, next) =>
				previous?.collectionKey === next?.collectionKey &&
				previous?.documentId === next?.documentId &&
				previous?.requestId === next?.requestId,
		},
	);

	// ----------------------------------------
	// Functions
	/** Sends a heartbeat now and keeps its answer, unless the editor moved to another document meanwhile. */
	const send = async (takeOver = false) => {
		const current = location();
		if (!current) return;

		try {
			const response = await api.documents.updateEditorReq({
				...current,
				takeOver,
			});
			if (location() === current) setEditors(response.data);
		} catch {}
	};
	/** Takes hold of the document from the tab that holds it. */
	const takeOver = async () => {
		setTakingOver(true);
		try {
			await send(true);
		} finally {
			setTakingOver(false);
		}
	};

	// ----------------------------------------
	// Effects
	createEffect(
		on(location, (current) => {
			setEditors(undefined);
			if (!current) return;

			let timer: ReturnType<typeof setTimeout> | undefined;
			let stopped = false;
			//* a failed heartbeat keeps the last answer and tries again next time
			const beat = async () => {
				await send();
				if (!stopped) timer = setTimeout(beat, heartbeatMs);
			};
			const release = () => {
				void api.documents.deleteEditorReq(current).catch(() => undefined);
			};
			//* hidden tabs slow their timers, so a tab coming back checks straight away
			const visible = () => {
				if (document.visibilityState === "visible") void send();
			};

			void beat();
			window.addEventListener("pagehide", release);
			document.addEventListener("visibilitychange", visible);
			onCleanup(() => {
				stopped = true;
				clearTimeout(timer);
				window.removeEventListener("pagehide", release);
				document.removeEventListener("visibilitychange", visible);
				release();
			});
		}),
	);

	// ----------------------------------------
	// Return
	return {
		/** Whether this tab can edit. True until the server says otherwise. */
		holding: () => editors()?.holding !== false,
		/** The tab that holds the document, when it isn't this one. */
		holder: () => editors()?.holder ?? null,
		takeOver,
		takingOver,
		/** Checks who holds the document now, eg. after a save was refused. */
		refresh: () => send(),
	};
};

export type UseDocumentEditors = ReturnType<typeof useDocumentEditors>;
