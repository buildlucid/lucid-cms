import T from "@/translations";
import { type Component, createMemo, Show, Switch, Match, For } from "solid-js";
import helpers from "@/utils/helpers";
import { useLocation } from "@solidjs/router";
import { NavigationLink, LinkGroup } from "@/components/Groups/Navigation";
import { getDocumentRoute } from "@/utils/route-helpers";
import type { CollectionResponse } from "@types";

export const CollectionSubMenu: Component<{
	state: {
		isLoading: boolean;
		isError: boolean;
		multiCollections: CollectionResponse[];
		singleCollections: CollectionResponse[];
	};
}> = (props) => {
	// ----------------------------------------
	// State
	const location = useLocation();

	// ----------------------------------------
	// Memos
	const showSubMenu = createMemo(() => {
		if (
			props.state.multiCollections.length === 0 &&
			props.state.singleCollections.length === 0
		)
			return false;
		if (location.pathname.includes("/admin/collections")) return true;
	});

	// ----------------------------------------
	// Render
	return (
		<Show when={showSubMenu()}>
			<div class="w-60 py-5 h-full border-l border-border overflow-y-auto">
				<Switch>
					<Match when={props.state.isLoading}>
						<div class="px-15">
							<span class="skeleton block h-10 w-full mb-2.5" />
							<span class="skeleton block h-10 w-full mb-2.5" />
							<span class="skeleton block h-10 w-full mb-2.5" />
							<span class="skeleton block h-10 w-full mb-2.5" />
							<span class="skeleton block h-10 w-full mb-2.5" />
							<span class="skeleton block h-10 w-full mb-2.5" />
						</div>
					</Match>
					<Match when={props.state.isError}>error</Match>
					<Match when={true}>
						{/* Multi Collections */}
						<Show when={props.state.multiCollections.length > 0}>
							<LinkGroup title={T()("multiple_documents")}>
								<For each={props.state.multiCollections}>
									{(collection) => (
										<NavigationLink
											title={helpers.getLocaleValue({
												value: collection.details.name,
											})}
											href={`/admin/collections/${collection.key}`}
											icon="page"
											activeIfIncludes={`/admin/collections/${collection.key}`}
										/>
									)}
								</For>
							</LinkGroup>
						</Show>
						{/* Single Collections */}
						<Show when={props.state.singleCollections.length > 0}>
							<LinkGroup title={T()("single_documents")}>
								<For each={props.state.singleCollections}>
									{(collection) => (
										<NavigationLink
											title={helpers.getLocaleValue({
												value: collection.details.name,
											})}
											href={
												collection.documentId
													? getDocumentRoute("edit", {
															collectionKey: collection.key,
															useDrafts: collection.config.useDrafts,
															documentId: collection.documentId,
														})
													: getDocumentRoute("create", {
															collectionKey: collection.key,
															useDrafts: collection.config.useDrafts,
														})
											}
											activeIfIncludes={`/admin/collections/${collection.key}`}
											icon="page"
										/>
									)}
								</For>
							</LinkGroup>
						</Show>
					</Match>
				</Switch>
			</div>
		</Show>
	);
};
