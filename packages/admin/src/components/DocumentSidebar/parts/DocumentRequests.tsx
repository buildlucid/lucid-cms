import { TbOutlineExternalLink } from "solid-icons/tb";
import { type Accessor, type Component, createMemo, Show } from "solid-js";
import DocumentSidebarSection from "@/components/DocumentSidebarSection/DocumentSidebarSection";
import RequestCompactList from "@/components/RequestCompactList/RequestCompactList";
import ViewAllLink from "@/components/ViewAllLink/ViewAllLink";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";
import { formatRelationFilterValue } from "@/utils/document-filter-fields";

export const DocumentRequests: Component<{
	collectionKey: Accessor<string>;
	documentId: Accessor<number | undefined>;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const enabled = () =>
		props.documentId() !== undefined &&
		userStore.get.hasPermission([Permissions.RequestsRead]).all;
	const documentRef = createMemo(() => {
		const documentId = props.documentId();
		if (documentId === undefined) return undefined;
		return formatRelationFilterValue({
			collectionKey: props.collectionKey(),
			id: documentId,
		});
	});

	// ----------------------------------------
	// Queries
	const requests = api.requests.useGetMultiple({
		queryParams: {
			filters: {
				status: () => "open",
				document: documentRef,
			},
			perPage: 5,
		},
		enabled,
	});

	// ----------------------------------------
	// Render
	return (
		<Show when={enabled()}>
			<DocumentSidebarSection
				title={T()("requests.title")}
				icon={<TbOutlineExternalLink size={12} />}
				preferenceKey="pageBuilder.sidebar.requests"
				meta={requests.data?.meta.total || undefined}
			>
				<RequestCompactList
					requests={requests.data?.data ?? []}
					loading={requests.isLoading}
				/>
				<Show when={(requests.data?.data.length ?? 0) > 0}>
					<ViewAllLink
						class="mt-2 -ms-1 w-fit"
						href={`/lucid/requests?filter[document]=${encodeURIComponent(documentRef() ?? "")}`}
					/>
				</Show>
			</DocumentSidebarSection>
		</Show>
	);
};
