import { A } from "@solidjs/router";
import type { MediaFolderBreadcrumbResponse } from "@types";
import { type Accessor, type Component, For, Match, Switch } from "solid-js";
import { FaSolidChevronRight, FaSolidHouse } from "solid-icons/fa";
import T from "@/translations";

export const Breadcrumbs: Component<{
	state: {
		parentFolderId: Accessor<number | string | undefined>;
		breadcrumbs: MediaFolderBreadcrumbResponse[];
	};
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<ul
			class="flex flex-wrap items-center gap-1"
			aria-label={T()("breadcrumbs")}
		>
			<li>
				<A href={"/admin"} class="hover:text-title text-sm">
					<FaSolidHouse />
				</A>
			</li>
			<li aria-hidden="true" class="px-1">
				<FaSolidChevronRight size={10} class="fill-current mt-px" />
			</li>
			<li>
				<Switch>
					<Match when={props.state.parentFolderId() !== ""}>
						<A
							href={"/admin/media"}
							class="hover:text-title text-sm"
							noScroll={true}
						>
							<span>{T()("media_library")}</span>
						</A>
					</Match>
					<Match when={props.state.parentFolderId() === ""}>
						<span class="font-medium text-body text-sm">
							{T()("media_library")}
						</span>
					</Match>
				</Switch>
			</li>
			<For each={props.state.breadcrumbs}>
				{(breadcrumb, i) => (
					<>
						<li aria-hidden="true" class="px-1">
							<FaSolidChevronRight size={10} class="fill-current mt-px" />
						</li>
						<li>
							<Switch>
								<Match when={i() !== props.state.breadcrumbs.length - 1}>
									<A
										href={`/admin/media/${breadcrumb.id}`}
										class="hover:text-title text-sm"
										noScroll={true}
									>
										<span>{breadcrumb.title}</span>
									</A>
								</Match>
								<Match when={i() === props.state.breadcrumbs.length - 1}>
									<span class="font-medium text-title text-sm">
										{breadcrumb.title}
									</span>
								</Match>
							</Switch>
						</li>
					</>
				)}
			</For>
		</ul>
	);
};
