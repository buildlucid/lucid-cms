import type {
	Collection,
	DocumentEnvironmentStatus,
	DocumentVersionUpdateResponse,
	InternalCollectionDocument,
} from "@types";
import { FaSolidCloudArrowUp } from "solid-icons/fa";
import { type Accessor, type Component, createMemo, Show } from "solid-js";
import DetailsList, {
	type DetailsListProps,
} from "@/components/DetailsList/DetailsList";
import DocumentSidebarSection from "@/components/DocumentSidebarSection/DocumentSidebarSection";
import T from "@/translations";
import {
	getDocumentEnvironmentStatus,
	getDocumentEnvironmentStatusLabel,
} from "@/utils/document-environment-status";
import helpers from "@/utils/helpers";

const statusVariants: Record<
	DocumentEnvironmentStatus,
	NonNullable<DetailsListProps["items"][number]["pillVariant"]>
> = {
	"in-sync": "success-subtle",
	"out-of-sync": "warning-subtle",
	unreleased: "danger-subtle",
};

export const EnvironmentStatus: Component<{
	collection: Accessor<Collection | undefined>;
	document: Accessor<InternalCollectionDocument | undefined>;
	autoSaveMetadata?: Accessor<DocumentVersionUpdateResponse | null>;
}> = (props) => {
	// ----------------------------------
	// Memos
	const latestContentId = createMemo(() => {
		const document = props.document();
		const metadata = props.autoSaveMetadata?.();
		if (
			document &&
			metadata?.id === document.id &&
			metadata.versionId === document.versionId &&
			metadata.versionType === "latest"
		) {
			return metadata.contentId;
		}

		return document?.versions.latest?.contentId;
	});
	const statusItems = createMemo<DetailsListProps["items"]>(() => {
		const collection = props.collection();
		const document = props.document();
		if (!collection || !document) return [];

		return collection.publishing.targets.map((environment) => {
			const status = getDocumentEnvironmentStatus({
				versions: document.versions,
				environmentKey: environment.key,
				latestContentId: latestContentId(),
			});

			return {
				label:
					helpers.getLocaleValue({
						value: environment.label,
						fallback: environment.key,
					}) || environment.key,
				value: getDocumentEnvironmentStatusLabel(status),
				type: "pill" as const,
				pillVariant: statusVariants[status],
				pillSize: "xs",
			};
		});
	});

	// ----------------------------------
	// Render
	return (
		<Show when={statusItems().length > 0}>
			<DocumentSidebarSection
				title={T()("documents.release.status")}
				icon={<FaSolidCloudArrowUp size={12} />}
				preferenceKey="pageBuilder.sidebar.environmentStatus"
			>
				<DetailsList
					class="mb-6 last:mb-0"
					padding="sm"
					items={statusItems()}
				/>
			</DocumentSidebarSection>
		</Show>
	);
};
