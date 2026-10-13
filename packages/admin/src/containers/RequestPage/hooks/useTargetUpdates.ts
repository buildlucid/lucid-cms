import type { Collection, RequestDetails, RequestDocument } from "@types";
import { createMemo, createSignal } from "solid-js";
import api from "@/services/api";
import { getAllowedTargets } from "@/utils/requests";

/** Saves document targets, holding changes that dismiss approval in `pending` until `confirm` is called. */
export const useTargetUpdates = (props: {
	request: () => RequestDetails;
	document: () => RequestDocument;
	collection: () => Collection | undefined;
}) => {
	const [pending, setPending] = createSignal<string[]>();
	const update = api.requests.useUpdateTargets({
		onSuccess: () => setPending(undefined),
	});

	const selected = createMemo(() =>
		props.document().targets.map((target) => target.target),
	);

	const mutate = (targets: string[]) =>
		update.action.mutate({
			id: props.request().id,
			requestDocumentId: props.document().id,
			body: { targets },
		});
	const save = (targets: string[]) => {
		if (props.request().approved) {
			update.reset();
			setPending(targets);
			return;
		}
		mutate(targets);
	};

	return {
		update,
		pending,
		selected,
		/** Adds a target, keeping the collection's environment order. */
		add: (target: string) =>
			save(
				getAllowedTargets(props.collection(), props.document().source).filter(
					(key) => key === target || selected().includes(key),
				),
			),
		remove: (target: string) =>
			save(selected().filter((key) => key !== target)),
		confirm: () => {
			const targets = pending();
			if (targets) mutate(targets);
		},
		cancel: () => setPending(undefined),
	};
};

export type TargetUpdates = ReturnType<typeof useTargetUpdates>;
