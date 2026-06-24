import type { Collection } from "@types";
import { type Component, createMemo } from "solid-js";
import { IconLinkFull } from "@/components/Groups/Navigation";
import helpers from "@/utils/helpers";
import { getDocumentRoute } from "@/utils/route-helpers";

interface CollectionNavLinkProps {
	collection: Collection;
}

const CollectionNavLink: Component<CollectionNavLinkProps> = (props) => {
	// ----------------------------------
	// Memos
	const href = createMemo(() => {
		if (props.collection.mode === "multiple") {
			return `/lucid/collections/${props.collection.key}`;
		}

		return props.collection.documentId
			? getDocumentRoute("edit", {
					collectionKey: props.collection.key,
					documentId: props.collection.documentId,
				})
			: getDocumentRoute("create", {
					collectionKey: props.collection.key,
				});
	});

	// ----------------------------------
	// Render
	return (
		<IconLinkFull
			type="link"
			href={href()}
			icon={
				props.collection.mode === "multiple"
					? "collection-multiple"
					: "collection-single"
			}
			title={helpers.getLocaleValue({
				value: props.collection.details.name,
			})}
		/>
	);
};

export default CollectionNavLink;
