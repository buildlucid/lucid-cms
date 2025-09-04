import T from "@/translations";
import { type Accessor, Show, type Component } from "solid-js";
import { Breadcrumbs } from "@/components/Groups/Layout";
import { getDocumentRoute } from "@/utils/route-helpers";
import { A } from "@solidjs/router";
import classNames from "classnames";
import type { UseDocumentUIState } from "@/hooks/document/useDocumentUIState";
import type { CollectionResponse } from "@types";

export const Header: Component<{
	mode: "create" | "edit" | "revisions";
	version?: "draft" | "published";

	state: {
		collection: Accessor<CollectionResponse | undefined>;
		collectionKey: Accessor<string>;
		collectionName: Accessor<string>;
		collectionSingularName: Accessor<string>;
		documentID: Accessor<number | undefined>;
		canNavigateToPublished: UseDocumentUIState["canNavigateToPublished"];
		showRevisionNavigation: UseDocumentUIState["showRevisionNavigation"];
	};
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<header class="bg-background-base w-full -mt-4 pt-6 px-6 pb-px border-x border-border z-31">
			<Show when={props.mode === "edit"}>
				<h1>
					{props.state.collectionSingularName()} - #{props.state.documentID()}
				</h1>
			</Show>
			<Show when={props.mode === "create"}>
				<h1>
					{T()("create")} {props.state.collectionSingularName()}
				</h1>
			</Show>
			<Show when={props.mode === "revisions"}>
				<h1>
					{props.state.collectionSingularName()} {T()("revisions")}
				</h1>
			</Show>

			<nav class="-mb-px bg-background-base mt-4">
				<ul class="flex gap-2">
					{/* Draft edit */}
					<Show when={props.state.collection()?.config.useDrafts}>
						<li class="relative">
							<A
								href={
									props.mode !== "create"
										? getDocumentRoute("edit", {
												collectionKey: props.state.collectionKey(),
												useDrafts: props.state.collection()?.config.useDrafts,
												documentId: props.state.documentID(),
											})
										: "#"
								}
								class={classNames(
									"flex px-4 py-2 font-medium relative z-10 border-transparent border-x border-t rounded-t-xl",
									{
										"bg-background-base !border-border focus:ring-0":
											props.version === "draft",
									},
								)}
							>
								{T()("draft")}

								<Show when={props.version === "draft"}>
									<span class="absolute -bottom-px -left-2 w-[9px] h-2 z-20 bg-background-base" />
									<span class="absolute -bottom-px -right-2 w-[9px] h-2 z-20 bg-background-base" />
									<span class="absolute -bottom-px -left-2 w-2 z-21 h-2 bg-background-base rounded-br-xl border-b border-r border-border" />
									<span class="absolute -bottom-px -right-2 w-2 z-21 h-2 bg-background-base rounded-bl-xl border-b border-l border-border" />
									<span class="absolute -bottom-px -left-2 -right-2 h-px z-20 bg-background-base" />
								</Show>
							</A>
						</li>
					</Show>

					{/* Published edit/view */}
					<li class="relative">
						<A
							href={
								props.state.canNavigateToPublished()
									? `/admin/collections/${props.state.collectionKey()}/published/${props.state.documentID()}`
									: "#"
							}
							class={classNames(
								"flex px-4 py-2 font-medium relative z-10 border-transparent border-x border-t rounded-t-xl",
								{
									"opacity-50 cursor-not-allowed focus:ring-0 hover:text-inherit":
										!props.state.canNavigateToPublished(),
									"cursor-pointer": props.state.canNavigateToPublished(),
									"bg-background-base !border-border focus:ring-0":
										props.version === "published",
								},
							)}
							aria-disabled={!props.state.canNavigateToPublished()}
							title={
								!props.state.canNavigateToPublished()
									? T()("document_not_published")
									: ""
							}
						>
							{T()("published")}

							<Show when={props.version === "published"}>
								<span class="absolute -bottom-px -left-2 w-[9px] h-2 z-20 bg-background-base" />
								<span class="absolute -bottom-px -right-2 w-[9px] h-2 z-20 bg-background-base" />
								<span class="absolute -bottom-px -left-2 w-2 z-21 h-2 bg-background-base rounded-br-xl border-b border-r border-border" />
								<span class="absolute -bottom-px -right-2 w-2 z-21 h-2 bg-background-base rounded-bl-xl border-b border-l border-border" />
								<span class="absolute -bottom-px -left-2 -right-2 h-px z-20 bg-background-base" />
							</Show>
						</A>
					</li>

					{/* Revisions */}
					<Show when={props.state.showRevisionNavigation()}>
						<li class="relative">
							<A
								href={`/admin/collections/${props.state.collectionKey()}/revisions/${props.state.documentID()}/latest`}
								class={classNames(
									"flex px-4 py-2 font-medium relative z-10 border-transparent border-x border-t rounded-t-xl",
									{
										"bg-background-base !border-border focus:ring-0":
											props.mode === "revisions",
									},
								)}
							>
								{T()("revisions")}
								<Show when={props.mode === "revisions"}>
									<span class="absolute -bottom-px -left-2 w-[9px] h-2 z-20 bg-background-base" />
									<span class="absolute -bottom-px -right-2 w-[9px] h-2 z-20 bg-background-base" />
									<span class="absolute -bottom-px -left-2 w-2 z-21 h-2 bg-background-base rounded-br-xl border-b border-r border-border" />
									<span class="absolute -bottom-px -right-2 w-2 z-21 h-2 bg-background-base rounded-bl-xl border-b border-l border-border" />
									<span class="absolute -bottom-px -left-2 -right-2 h-px z-20 bg-background-base" />
								</Show>
							</A>
						</li>
					</Show>
				</ul>
			</nav>
		</header>
	);
};
