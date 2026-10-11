import { useNavigate } from "@solidjs/router";
import { type Accessor, createEffect, createMemo } from "solid-js";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import { formatRelationFilterValue } from "@/utils/document-filter-fields";
import { getDocumentRoute, getRequestRoute } from "@/utils/route-helpers";

/** Versions the editor loads by their ID rather than their type. */
const storedVersionTypes = new Set(["revision", "snapshot", "proposal"]);

/** Redirects stored versions without IDs to latest and proposals to their open request or latest, reporting redirection so the editor remains loading. */
export const useStoredVersionRedirect = (props: {
	/** Off when a request opens the editor, as it already provides the proposal's request. */
	enabled: Accessor<boolean>;
	collectionKey: Accessor<string>;
	documentId: Accessor<number | undefined>;
	versionType: Accessor<string>;
	versionId: Accessor<number | undefined>;
}) => {
	// ----------------------------------------
	// State & Hooks
	const navigate = useNavigate();

	// ----------------------------------------
	// Memos
	const redirecting = createMemo(
		() =>
			props.enabled() &&
			props.documentId() !== undefined &&
			((storedVersionTypes.has(props.versionType()) &&
				props.versionId() === undefined) ||
				props.versionType() === "proposal"),
	);
	const findsRequest = createMemo(
		() =>
			redirecting() &&
			props.versionId() !== undefined &&
			userStore.get.hasPermission([Permissions.RequestsRead]).all,
	);

	// ----------------------------------------
	// Queries
	//* proposals only exist while their request is open
	const requests = api.requests.useGetMultiple({
		queryParams: {
			filters: {
				document: () => {
					const id = props.documentId();
					return id === undefined
						? undefined
						: formatRelationFilterValue({
								collectionKey: props.collectionKey(),
								id,
							});
				},
				status: () => "open",
			},
			perPage: 50,
		},
		enabled: findsRequest,
	});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		const documentId = props.documentId();
		if (!redirecting() || documentId === undefined) return;
		if (findsRequest() && requests.isPending) return;

		const collectionKey = props.collectionKey();
		const versionId = props.versionId();
		const request = requests.data?.data.find((candidate) =>
			candidate.documents.some(
				(document) =>
					document.collectionKey === collectionKey &&
					document.documentId === documentId &&
					document.versionId === versionId,
			),
		);
		navigate(
			request && findsRequest()
				? getRequestRoute({
						requestId: request.id,
						content: { collectionKey, documentId },
					})
				: getDocumentRoute("edit", { collectionKey, documentId }),
			{ replace: true },
		);
	});

	return redirecting;
};
