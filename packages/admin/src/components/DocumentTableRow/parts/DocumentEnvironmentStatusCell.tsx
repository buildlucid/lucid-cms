import type { InternalCollectionDocument } from "@types";
import classNames from "classnames";
import { type Component, createMemo } from "solid-js";
import Table from "@/components/Table/Table";
import {
	getDocumentEnvironmentStatus,
	getDocumentEnvironmentStatusLabel,
} from "@/utils/document-environment-status";

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
				<span
					class={classNames("size-2.5 shrink-0 rounded-full border", {
						"border-primary-muted-border bg-primary-muted-bg":
							status() === "in-sync",
						"border-warning-base/60 bg-warning-base/40":
							status() === "out-of-sync",
						"border-error-base/60 bg-error-base/40": status() === "unreleased",
					})}
					aria-hidden="true"
				/>
				<span class="text-sm text-subtitle">
					{getDocumentEnvironmentStatusLabel(status())}
				</span>
			</div>
		</Table.Cell>
	);
};

export default DocumentEnvironmentStatusCell;
