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
import T from "@/translations";
import { LucidError } from "@/utils/error-handling";
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
	const [takeOverError, setTakeOverError] = createSignal<string>();
	//* the hold the person closed the notice for, so it shows again when someone else takes hold
	const [dismissed, setDismissed] = createSignal<string>();

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
	const holdKey = createMemo(() => {
		const holder = editors()?.holder;
		return holder ? `${holder.user.id}:${holder.since}` : undefined;
	});

	// ----------------------------------------
	// Functions
	/** Sends a heartbeat, ignores responses after navigation, and returns any error. */
	const send = async (takeOver = false) => {
		const current = location();
		if (!current) return undefined;

		try {
			const response = await api.documents.updateEditorReq({
				...current,
				takeOver,
			});
			if (location() === current) setEditors(response.data);
			return undefined;
		} catch (error) {
			return error;
		}
	};
	/** Takes over the document, reopening the notice with an explanation if the attempt fails. */
	const takeOver = async () => {
		setTakingOver(true);
		setTakeOverError(undefined);
		try {
			const error = await send(true);
			if (error !== undefined) {
				setTakeOverError(
					(error instanceof LucidError ? error.errorRes.message : undefined) ??
						T()("documents.held.take.over.failed"),
				);
				setDismissed(undefined);
			}
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
			//* send returns errors, so release can await this without a rejection handler.
			let inFlight: Promise<unknown> = Promise.resolve();
			const heartbeat = () => {
				inFlight = send();
				return inFlight;
			};
			//* a failed heartbeat keeps the last answer and tries again next time
			const beat = async () => {
				await heartbeat();
				if (!stopped) timer = setTimeout(beat, heartbeatMs);
			};
			const release = () => {
				void api.documents.deleteEditorReq(current).catch(() => undefined);
			};
			//* hidden tabs slow their timers, so a tab coming back checks straight away
			const visible = () => {
				if (document.visibilityState === "visible") void heartbeat();
			};

			void beat();
			window.addEventListener("pagehide", release);
			document.addEventListener("visibilitychange", visible);
			onCleanup(() => {
				stopped = true;
				clearTimeout(timer);
				window.removeEventListener("pagehide", release);
				document.removeEventListener("visibilitychange", visible);
				//* a heartbeat landing after the release would hold the document again for 90 seconds
				void inFlight.then(release);
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
		takeOverError,
		/** Shows the hold notice until dismissed, keeping it closed for that hold. */
		noticeOpen: () => holdKey() !== undefined && holdKey() !== dismissed(),
		dismissNotice: () => {
			setDismissed(holdKey());
			setTakeOverError(undefined);
		},
		/** Checks who holds the document now, eg. after a save was refused. */
		refresh: () => void send(),
	};
};
