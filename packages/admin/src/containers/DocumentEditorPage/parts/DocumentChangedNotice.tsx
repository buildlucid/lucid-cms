import type { Component } from "solid-js";
import Button from "@/components/Button/Button";
import T from "@/translations";
import DocumentNotice from "./DocumentNotice";

/** Shown above the fields when the saved content changed under unsaved edits, eg. someone else or the agent saved it. */
const DocumentChangedNotice: Component<{
	reloading: boolean;
	onKeep: () => void;
	onReload: () => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<DocumentNotice
			actions={
				<>
					<Button size="xs" variant="ghost" onClick={() => props.onKeep()}>
						{T()("documents.changed.keep")}
					</Button>
					<Button
						size="xs"
						variant="outline"
						loading={props.reloading}
						onClick={() => props.onReload()}
					>
						{T()("documents.changed.reload")}
					</Button>
				</>
			}
		>
			{T()("documents.changed.message")}
		</DocumentNotice>
	);
};

export default DocumentChangedNotice;
