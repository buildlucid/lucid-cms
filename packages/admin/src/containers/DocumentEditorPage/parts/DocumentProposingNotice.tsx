import { type Component, Show } from "solid-js";
import Link from "@/components/Link/Link";
import T from "@/translations";
import DocumentNotice from "./DocumentNotice";

/**
 * Shown above the fields for people whose changes to latest are reviewed, and links to an
 * update request of theirs that already holds this document, so they carry on there.
 */
const DocumentProposingNotice: Component<{
	collectionName: string;
	/** The person's own open update request for this document, if they have one. */
	ownRequest?: { title: string; href: string };
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<DocumentNotice
			actions={
				<Show when={props.ownRequest}>
					{(request) => (
						<Link variant="outline" size="xs" href={request().href}>
							{T()("documents.proposing.continue")}
						</Link>
					)}
				</Show>
			}
		>
			<Show
				when={props.ownRequest}
				fallback={T()("documents.proposing.message", {
					name: props.collectionName.toLowerCase(),
				})}
			>
				{(request) =>
					T()("documents.proposing.existing", {
						name: props.collectionName.toLowerCase(),
						request: request().title,
					})
				}
			</Show>
		</DocumentNotice>
	);
};

export default DocumentProposingNotice;
