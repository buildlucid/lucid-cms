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
} from "@/components/Partials/DetailsList";
import T from "@/translations";
import {
	getDocumentEnvironmentStatus,
	getDocumentEnvironmentStatusLabel,
} from "@/utils/document-environment-status";
import helpers from "@/utils/helpers";
import SidebarSection from "./Partials/SidebarSection";

const statusThemes: Record<
	DocumentEnvironmentStatus,
	NonNullable<DetailsListProps["items"][number]["pillTheme"]>
> = {
	"in-sync": "primary-opaque",
	"out-of-sync": "warning-opaque",
	unreleased: "error-opaque",
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

		return collection.environments.map((environment) => {
			const status = getDocumentEnvironmentStatus({
				versions: document.versions,
				environmentKey: environment.key,
				latestContentId: latestContentId(),
			});

			return {
				label:
					helpers.getLocaleValue({
						value: environment.name,
						fallback: environment.key,
					}) || environment.key,
				value: getDocumentEnvironmentStatusLabel(status),
				pillTheme: statusThemes[status],
				pillSize: "small",
			};
		});
	});

	// ----------------------------------
	// Render
	return (
		<Show when={statusItems().length > 0}>
			<SidebarSection
				title={T()("documents.release.status")}
				icon={<FaSolidCloudArrowUp size={12} />}
				preferenceKey="pageBuilder.sidebar.environmentStatus"
			>
				<DetailsList type="pill" padding={12} items={statusItems()} />
			</SidebarSection>
		</Show>
	);
};
