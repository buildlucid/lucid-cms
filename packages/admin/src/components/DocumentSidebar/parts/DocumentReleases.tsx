import { FaSolidSquareArrowUpRight } from "solid-icons/fa";
import { type Accessor, type Component, Show } from "solid-js";
import DocumentSidebarSection from "@/components/DocumentSidebarSection/DocumentSidebarSection";
import ReleaseCompactList from "@/components/ReleaseCompactList/ReleaseCompactList";
import ViewAllLink from "@/components/ViewAllLink/ViewAllLink";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";

export const DocumentReleases: Component<{
	collectionKey: Accessor<string>;
	documentId: Accessor<number | undefined>;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const enabled = () =>
		props.documentId() !== undefined &&
		userStore.get.hasPermission([Permissions.ReleasesRead]).all;

	// ----------------------------------------
	// Queries
	const releases = api.releases.useGetMultiple({
		queryParams: {
			filters: {
				status: () => "open",
				collectionKey: props.collectionKey,
				documentId: props.documentId,
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
				title={T()("releases.title")}
				icon={<FaSolidSquareArrowUpRight size={12} />}
				preferenceKey="pageBuilder.sidebar.releases"
				meta={releases.data?.meta.total || undefined}
			>
				<ReleaseCompactList
					releases={releases.data?.data ?? []}
					loading={releases.isLoading}
				/>
				<Show when={(releases.data?.data.length ?? 0) > 0}>
					<ViewAllLink
						class="mt-2 -ms-1 w-fit"
						href={`/lucid/releases?filter[collectionKey]=${encodeURIComponent(props.collectionKey())}&filter[documentId]=${props.documentId()}`}
					/>
				</Show>
			</DocumentSidebarSection>
		</Show>
	);
};
