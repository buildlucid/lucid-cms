import type {
	Collection,
	DocumentVersionUpdateResponse,
	InternalCollectionDocument,
} from "@types";
import { FaSolidInfo } from "solid-icons/fa";
import { type Accessor, type Component, createMemo } from "solid-js";
import DateText from "@/components/Partials/DateText";
import DetailsList, {
	type DetailsListProps,
} from "@/components/Partials/DetailsList";
import T from "@/translations";
import helpers from "@/utils/helpers";
import SidebarSection from "./Partials/SidebarSection";
import UserDetailValue from "./Partials/UserDetailValue";

export const DocumentDetails: Component<{
	collection: Accessor<Collection | undefined>;
	document: Accessor<InternalCollectionDocument | undefined>;
	autoSaveMetadata?: Accessor<DocumentVersionUpdateResponse | null>;
	documentId: Accessor<number | undefined>;
}> = (props) => {
	// ----------------------------------
	// Memos
	const collectionName = createMemo(() => {
		const collection = props.collection();
		return (
			helpers.getLocaleValue({
				value: collection?.details.name,
				fallback: collection?.key,
			}) || "-"
		);
	});
	const updatedAt = createMemo(() => {
		const document = props.document();
		const metadata = props.autoSaveMetadata?.();
		if (!document || !metadata) return document?.updatedAt;
		if (metadata.id !== document.id) return document.updatedAt;
		if (metadata.versionId !== document.versionId) return document.updatedAt;

		return metadata.updatedAt;
	});
	const details = createMemo<DetailsListProps["items"]>(() => {
		const document = props.document();

		return [
			{
				label: T()("common.created.at"),
				value: <DateText date={document?.createdAt ?? null} class="text-sm" />,
				show: Boolean(document?.createdAt),
			},
			{
				label: T()("common.updated.at"),
				value: <DateText date={updatedAt() ?? null} class="text-sm" />,
				show: Boolean(updatedAt()),
			},
			{
				label: T()("common.document.id"),
				value: props.documentId() ?? "-",
				show: props.documentId() !== undefined,
			},
			{
				label: T()("common.collection"),
				value: collectionName(),
				show: true,
			},
			{
				label: T()("common.status"),
				value: document?.isDeleted
					? T()("common.status.deleted")
					: (document?.version ?? T()("common.unsaved")),
				show: true,
			},
			{
				label: T()("common.created.by"),
				value: <UserDetailValue user={document?.createdBy ?? null} />,
				show: document !== undefined,
			},
			{
				label: T()("common.updated.by"),
				value: <UserDetailValue user={document?.updatedBy ?? null} />,
				show: document !== undefined,
			},
		];
	});

	// ----------------------------------
	// Render
	return (
		<SidebarSection
			title={T()("common.document.details")}
			icon={<FaSolidInfo size={12} />}
			preferenceKey="pageBuilder.sidebar.documentDetails"
		>
			<DetailsList type="text" padding={12} items={details()} />
		</SidebarSection>
	);
};
