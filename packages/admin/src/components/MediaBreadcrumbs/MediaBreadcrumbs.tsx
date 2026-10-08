import { A } from "@solidjs/router";
import type { MediaFolderBreadcrumb } from "@types";
import { TbOutlineChevronRight, TbOutlineHome } from "solid-icons/tb";
import { type Accessor, type Component, For, Match, Switch } from "solid-js";
import T from "@/translations";

export const MediaBreadcrumbs: Component<{
	state: {
		parentFolderId: Accessor<number | string | undefined>;
		breadcrumbs: MediaFolderBreadcrumb[];
	};
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<ul
			class="flex flex-wrap items-center gap-1"
			aria-label={T()("common.breadcrumbs")}
		>
			<li>
				<A href={"/lucid"} class="hover:text-title text-sm">
					<TbOutlineHome />
				</A>
			</li>
			<li aria-hidden="true" class="px-1">
				<TbOutlineChevronRight size={10} class="mt-px" />
			</li>
			<li>
				<Switch>
					<Match when={props.state.parentFolderId() !== ""}>
						<A
							href={"/lucid/media"}
							class="hover:text-title text-sm"
							noScroll={true}
						>
							<span>{T()("media.library.title")}</span>
						</A>
					</Match>
					<Match when={props.state.parentFolderId() === ""}>
						<span class="font-medium text-body text-sm">
							{T()("media.library.title")}
						</span>
					</Match>
				</Switch>
			</li>
			<For each={props.state.breadcrumbs}>
				{(breadcrumb, i) => (
					<>
						<li aria-hidden="true" class="px-1">
							<TbOutlineChevronRight size={10} class="mt-px" />
						</li>
						<li>
							<Switch>
								<Match when={i() !== props.state.breadcrumbs.length - 1}>
									<A
										href={`/lucid/media/${breadcrumb.id}`}
										class="hover:text-title text-sm"
										noScroll={true}
									>
										<span>{breadcrumb.title}</span>
									</A>
								</Match>
								<Match when={i() === props.state.breadcrumbs.length - 1}>
									<span class="font-medium text-subtitle text-sm">
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
