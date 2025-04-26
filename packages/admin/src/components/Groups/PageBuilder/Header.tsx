import T from "@/translations";
import { Show, type Component } from "solid-js";
import { Breadcrumbs } from "@/components/Groups/Layout";
import { getDocumentRoute } from "@/utils/route-helpers";
import { A } from "@solidjs/router";
import classNames from "classnames";
import type { UseDocumentMutations } from "@/hooks/document/useDocumentMutations";
import type { UseDocumentState } from "@/hooks/document/useDocumentState";
import type { UseDocumentUIState } from "@/hooks/document/useDocumentUIState";

export const Header: Component<{
	mode: "create" | "edit" | "revisions";
	version?: "draft" | "published";
	hooks: {
		mutations: UseDocumentMutations;
		state: UseDocumentState;
		uiState: UseDocumentUIState;
	};
}> = (props) => {
	// ----------------------------------
	// Render
	return (
		<header class="bg-container-2 w-full -mt-15 pt-5 px-5 pb-0 border-x border-border">
			<Breadcrumbs
				breadcrumbs={[
					{
						link: `/admin/collections/${props.hooks.state.collectionKey()}`,
						label: props.hooks.state.collectionName() || "",
						include:
							props.hooks.state.collection?.data?.data.mode === "multiple",
					},
					{
						link:
							props.mode === "create"
								? getDocumentRoute("create", {
										collectionKey: props.hooks.state.collectionKey(),
										useDrafts:
											props.hooks.state.collection?.data?.data.config.useDrafts,
									})
								: getDocumentRoute("edit", {
										collectionKey: props.hooks.state.collectionKey(),
										useDrafts:
											props.hooks.state.collection?.data?.data.config.useDrafts,
										documentId: props.hooks.state.documentId(),
									}),
						label:
							props.mode === "create"
								? `${T()("create")} ${props.hooks.state.collectionSingularName()}`
								: `${T()("edit")} ${props.hooks.state.collectionSingularName()} (#${props.hooks.state.documentId()})`,
					},
				]}
				options={{
					noBorder: true,
					noPadding: true,
				}}
			/>

			<Show when={props.mode === "edit"}>
				<h1 class="mt-2.5">
					{props.hooks.state.collectionSingularName()} - #
					{props.hooks.state.documentId()}
				</h1>
			</Show>
			<Show when={props.mode === "create"}>
				<h1 class="mt-2.5">{props.hooks.state.collectionSingularName()}</h1>
			</Show>

			<nav class="-mb-px bg-container-2 mt-15">
				<ul class="flex gap-2">
					{/* Draft edit */}
					<Show
						when={props.hooks.state.collection?.data?.data.config.useDrafts}
					>
						<li class="relative">
							<A
								href={
									props.mode !== "create"
										? getDocumentRoute("edit", {
												collectionKey: props.hooks.state.collectionKey(),
												useDrafts:
													props.hooks.state.collection.data?.data.config
														.useDrafts,
												documentId: props.hooks.state.documentId(),
											})
										: "#"
								}
								class={classNames(
									"flex px-4 py-2 font-medium relative z-10 border-transparent border-x border-t rounded-t-xl",
									{
										"bg-container-3 !border-border focus:ring-0":
											props.version === "draft",
									},
								)}
							>
								{T()("edit")}

								<Show when={props.version === "draft"}>
									<span class="absolute bottom-0 -left-2 w-[9px] h-2 z-20 bg-container-3" />
									<span class="absolute bottom-0 -right-2 w-[9px] h-2 z-20 bg-container-3" />
									<span class="absolute bottom-[0.5px] -left-2 w-2 z-21 h-2 bg-container-2 rounded-br-xl border-b border-r border-border" />
									<span class="absolute bottom-[0.5px] -right-2 w-2 z-21 h-2 bg-container-2 rounded-bl-xl border-b border-l border-border" />
								</Show>
							</A>
						</li>
					</Show>

					{/* Published edit/view */}
					<li class="relative">
						<A
							href={
								props.hooks.uiState.canNavigateToPublished()
									? `/admin/collections/${props.hooks.state.collectionKey()}/published/${props.hooks.state.documentId()}`
									: "#"
							}
							class={classNames(
								"flex px-4 py-2 font-medium relative z-10 border-transparent border-x border-t rounded-t-xl",
								{
									"opacity-50 cursor-not-allowed focus:ring-0 hover:text-inherit":
										!props.hooks.uiState.canNavigateToPublished(),
									"cursor-pointer":
										props.hooks.uiState.canNavigateToPublished(),
									"bg-container-3 !border-border focus:ring-0":
										props.version === "published",
								},
							)}
							aria-disabled={!props.hooks.uiState.canNavigateToPublished()}
							title={
								!props.hooks.uiState.canNavigateToPublished()
									? T()("document_not_published")
									: ""
							}
						>
							{T()("published")}

							<Show when={props.version === "published"}>
								<span class="absolute bottom-0 -left-2 w-[9px] h-2 z-20 bg-container-3" />
								<span class="absolute bottom-0 -right-2 w-[9px] h-2 z-20 bg-container-3" />
								<span class="absolute bottom-[0.5px] -left-2 w-2 z-21 h-2 bg-container-2 rounded-br-xl border-b border-r border-border" />
								<span class="absolute bottom-[0.5px] -right-2 w-2 z-21 h-2 bg-container-2 rounded-bl-xl border-b border-l border-border" />
							</Show>
						</A>
					</li>

					{/* Revisions */}
					<Show when={props.hooks.uiState.showRevisionNavigation()}>
						<li class="relative">
							<A
								href={`/admin/collections/${props.hooks.state.collectionKey()}/revisions/${props.hooks.state.documentId()}/latest`}
								class={classNames(
									"flex px-4 py-2 font-medium relative z-10 border-transparent border-x border-t rounded-t-xl",
									{
										"bg-container-3 !border-border focus:ring-0":
											props.mode === "revisions",
									},
								)}
							>
								{T()("revisions")}
								<Show when={props.mode === "revisions"}>
									<span class="absolute bottom-0 -left-2 w-[9px] h-2 z-20 bg-container-3" />
									<span class="absolute bottom-0 -right-2 w-[9px] h-2 z-20 bg-container-3" />
									<span class="absolute bottom-[0.5px] -left-2 w-2 z-21 h-2 bg-container-2 rounded-br-xl border-b border-r border-border" />
									<span class="absolute bottom-[0.5px] -right-2 w-2 z-21 h-2 bg-container-2 rounded-bl-xl border-b border-l border-border" />
								</Show>
							</A>
						</li>
					</Show>
				</ul>
			</nav>
		</header>
	);
};
