import { useDocumentEditor, usePermissions } from "@lucidcms/admin/hooks";
import { queryKeys, request } from "@lucidcms/admin/services";
import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query";
import { createMemo } from "solid-js";
import { PREVIOUS_PATHS_ROUTE } from "../../constants.js";
import type { PreviousPath } from "../../schema/previous-paths.js";
import parsePreviousPaths from "../utils/parse-previous-paths.js";

/**
 * The open page's previous paths: the viewed environment's, or every environment's on latest.
 * The path button, sidebar section and drawer share the query, so each one stays in sync.
 */
const usePreviousPaths = () => {
	// ----------------------------------
	// State & Hooks
	const editor = useDocumentEditor();
	const permissions = usePermissions();
	const client = useQueryClient();

	// ----------------------------------
	// Memos
	const url = createMemo(() =>
		editor.documentId === undefined
			? undefined
			: `${PREVIOUS_PATHS_ROUTE}/${editor.collectionKey}/${editor.documentId}`,
	);
	//* under the document keys, so saves and publishes refresh the list
	const documentKey = createMemo(() => [
		...queryKeys.documents.collection(editor.collectionKey),
		"previous-paths",
		editor.documentId,
	]);
	const environment = createMemo(() => editor.environment);
	//* every environment shows on latest, so their labels tell the rows apart
	const showEnvironment = createMemo(
		() => environment() === undefined && editor.environments.length > 0,
	);

	// ----------------------------------
	// Queries & Mutations
	const paths = useQuery(() => ({
		queryKey: [...documentKey(), environment() ?? null],
		queryFn: () => {
			const viewed = environment();
			return request({
				url: viewed
					? `${url()}?${new URLSearchParams({ environment: viewed })}`
					: (url() ?? ""),
				parse: parsePreviousPaths,
			});
		},
		enabled: url() !== undefined,
	}));
	const remove = useMutation(() => ({
		mutationFn: (path: PreviousPath) =>
			request({ url: `${url()}/${path.id}`, method: "DELETE" }),
		onSuccess: () => client.invalidateQueries({ queryKey: documentKey() }),
	}));

	// ----------------------------------
	// Functions
	const environmentLabel = (key: string) =>
		editor.environments.find((option) => option.key === key)?.label ?? key;

	// ----------------------------------
	// Return
	return {
		/** New documents have no paths yet, so nothing asks for them. */
		saved: () => editor.documentId !== undefined,
		paths,
		remove,
		showEnvironment,
		environments: () => editor.environments,
		environmentLabel,
		canRemove: () =>
			permissions.can(`documents:${editor.collectionKey}:update`),
	};
};

export default usePreviousPaths;
