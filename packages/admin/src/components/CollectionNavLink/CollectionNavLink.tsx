import type { Collection } from "@types";
import type { Component } from "solid-js";
import { NavigationLink } from "@/components/NavigationLink/NavigationLink";
import helpers from "@/utils/helpers";
import { getDocumentRoute } from "@/utils/route-helpers";

export const getCollectionNavigationHref = (collection: Collection) => {
	if (collection.mode === "multiple") {
		return `/lucid/collections/${collection.key}`;
	}

	return collection.documentId
		? getDocumentRoute("edit", {
				collectionKey: collection.key,
				documentId: collection.documentId,
			})
		: getDocumentRoute("create", {
				collectionKey: collection.key,
			});
};

const CollectionNavLink: Component<{
	collection: Collection;
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<NavigationLink
			href={getCollectionNavigationHref(props.collection)}
			icon={
				props.collection.mode === "multiple"
					? "collection-multiple"
					: "collection-single"
			}
			title={helpers.getLocaleValue({
				value: props.collection.details.labels.plural,
			})}
		/>
	);
};

export default CollectionNavLink;
