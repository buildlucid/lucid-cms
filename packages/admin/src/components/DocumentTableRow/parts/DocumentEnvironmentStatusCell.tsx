import type {
	DocumentEnvironmentStatus,
	InternalCollectionDocument,
} from "@types";
import { type Component, createMemo } from "solid-js";
import StatusIndicator, {
	type StatusIndicatorVariant,
} from "@/components/StatusIndicator/StatusIndicator";
import Table from "@/components/Table/Table";
import {
	getDocumentEnvironmentStatus,
	getDocumentEnvironmentStatusLabel,
} from "@/utils/document-environment-status";

const statusVariants: Record<
	DocumentEnvironmentStatus,
	StatusIndicatorVariant
> = {
	"in-sync": "success-subtle",
	"out-of-sync": "warning-subtle",
	unreleased: "danger-subtle",
};

const DocumentEnvironmentStatusCell: Component<{
	column?: string;
	document: InternalCollectionDocument;
	environmentKey: string;
}> = (props) => {
	// ----------------------------------
	// Memos
	const status = createMemo(() =>
		getDocumentEnvironmentStatus({
			versions: props.document.versions,
			environmentKey: props.environmentKey,
		}),
	);

	// ----------------------------------
	// Render
	return (
		<Table.Cell column={props.column} minWidth={140}>
			<div class="flex items-center gap-2 whitespace-nowrap">
				<StatusIndicator variant={statusVariants[status()]} />
				<span class="text-sm text-subtitle">
					{getDocumentEnvironmentStatusLabel(status())}
				</span>
			</div>
		</Table.Cell>
	);
};

export default DocumentEnvironmentStatusCell;
