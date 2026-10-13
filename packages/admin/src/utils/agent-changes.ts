import type { QueryClient, QueryKey } from "@tanstack/solid-query";
import type { AgentResource } from "@types";
import { requestChangeKeys } from "@/services/api/requests/change-keys";
import { queryKeys } from "@/services/query-keys";

/** The cached queries that show a resource, matching what the admin's own edits to it refresh. */
const changedQueries = (change: AgentResource): QueryKey[] => {
	switch (change.type) {
		case "document":
			return [
				queryKeys.documents.collection(change.collectionKey),
				...requestChangeKeys(),
			];
		case "request":
			return requestChangeKeys();
		case "media":
			return [
				queryKeys.media.all(),
				queryKeys.mediaFolders.list(),
				queryKeys.mediaFolders.hierarchy(),
			];
	}
};

/** Refreshes open views of what a tool call changed, so pages show the agent's work as it happens. */
export const refreshAgentChanges = (
	queryClient: QueryClient,
	changes: AgentResource[],
) => {
	const queries = new Map(
		changes.flatMap(changedQueries).map((key) => [JSON.stringify(key), key]),
	);
	for (const queryKey of queries.values()) {
		void queryClient.invalidateQueries({ queryKey });
	}
};
