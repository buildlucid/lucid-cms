import type { Refs, RelationFieldValue } from "@types";
import { untrack } from "solid-js";
import api from "@/services/api";

//* the most items of each kind the refs route takes in one request
const REQUEST_LIMIT = 500;

/** A linked field's value whose display data the store may be missing. */
export type RefRequest = {
	/** The open document's collection. Nothing is fetched without one. */
	collectionKey: string | undefined;
} & (
	| {
			resource: "documents";
			value: readonly RelationFieldValue[] | null | undefined;
	  }
	| {
			resource: "media" | "users" | "emails";
			value: readonly number[] | null | undefined;
	  }
);

type Batch = {
	collectionKey: string;
	/** What had been asked for when the batch started. A refs load replaces it. */
	asked: Set<string>;
	documents: RelationFieldValue[];
	media: number[];
	users: number[];
	emails: number[];
};

const documentKey = (item: RelationFieldValue) =>
	`documents:${item.collectionKey}:${item.id}`;

/**
 * Batches missing reference requests per tick and deduplicates items until refs reload. Locked
 * panes use loaded refs without fetching.
 */
export const createRefRequests = (store: {
	refs: () => Refs;
	locked: () => boolean;
	addRefs: (refs: Refs) => void;
}) => {
	let asked = new Set<string>();
	let pending: Batch | undefined;

	const send = async (batch: Batch) => {
		//* a refs load or a lock since the batch started makes its results out of date
		const current = () => batch.asked === asked && !store.locked();
		//* dropped items can be asked for again, eg. once another tab lets go of the document
		const release = (from: number) => {
			for (const item of batch.documents.slice(from)) {
				batch.asked.delete(documentKey(item));
			}
			for (const resource of ["media", "users", "emails"] as const) {
				for (const id of batch[resource].slice(from)) {
					batch.asked.delete(`${resource}:${id}`);
				}
			}
		};
		const size = Math.max(
			batch.documents.length,
			batch.media.length,
			batch.users.length,
			batch.emails.length,
		);

		for (let start = 0; start < size; start += REQUEST_LIMIT) {
			if (!current()) return release(start);

			const end = start + REQUEST_LIMIT;
			try {
				const response = await api.documents.getEditorRefsReq({
					collectionKey: batch.collectionKey,
					body: {
						documents: batch.documents.slice(start, end),
						media: batch.media.slice(start, end),
						users: batch.users.slice(start, end),
						emails: batch.emails.slice(start, end),
					},
				});
				if (!current()) return release(start);
				store.addRefs(response.data);
			} catch {
				//* not retried, so a failing request can't repeat on every read; the next refs load starts again
			}
		}
	};

	return {
		request(props: RefRequest) {
			const { collectionKey } = props;
			if (!collectionKey || !props.value?.length || store.locked()) return;

			untrack(() => {
				const refs = store.refs();
				const batch =
					pending?.asked === asked
						? pending
						: {
								collectionKey,
								asked,
								documents: [],
								media: [],
								users: [],
								emails: [],
							};

				if (props.resource === "documents") {
					for (const item of props.value ?? []) {
						const key = documentKey(item);
						const held = refs.documents?.some(
							(ref) =>
								ref.id === item.id && ref.collectionKey === item.collectionKey,
						);
						if (held || asked.has(key)) continue;
						asked.add(key);
						batch.documents.push({
							id: item.id,
							collectionKey: item.collectionKey,
						});
					}
				} else {
					const resource = props.resource;
					for (const id of props.value ?? []) {
						const key = `${resource}:${id}`;
						const held = refs[resource]?.some((ref) => ref.id === id);
						if (held || asked.has(key)) continue;
						asked.add(key);
						batch[resource].push(id);
					}
				}

				const empty =
					batch.documents.length +
						batch.media.length +
						batch.users.length +
						batch.emails.length ===
					0;
				if (batch === pending || empty) return;

				pending = batch;
				queueMicrotask(() => {
					if (pending === batch) pending = undefined;
					void send(batch);
				});
			});
		},
		/** Starts again once refs load, so items missing from them can be asked for. */
		reset() {
			asked = new Set();
			pending = undefined;
		},
	};
};
