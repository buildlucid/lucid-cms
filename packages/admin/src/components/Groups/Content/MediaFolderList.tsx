import {
	type Accessor,
	type Component,
	createMemo,
	For,
	Match,
	Show,
	Switch,
} from "solid-js";
import api from "@/services/api";
import { DynamicContent } from "@/components/Groups/Layout";
import { Grid } from "@/components/Groups/Grid";
import { A } from "@solidjs/router";
import { FaSolidFolder } from "solid-icons/fa";
import { MediaFolderCardLoading } from "@/components/Cards/MediaFolderCard";

export const MediaFolderList: Component<{
	state: {
		parentFolderId: Accessor<number | string>;
	};
}> = (props) => {
	// -----------------------------------------
	// Queries
	const folders = api.mediaFolders.useGetMultiple({
		queryParams: {
			filters: {
				parentFolderId: props.state.parentFolderId,
			},
			perPage: -1,
		},
	});

	// ----------------------------------------
	// Memos
	const hideIfEmpty = createMemo(() => {
		if (folders.isLoading || folders.isError) return false; // show the DynamicContent

		//* hide when no breadcrumbs (no parent id) and no folders
		return (
			(folders.data?.data.folders.length || 0) === 0 &&
			props.state.parentFolderId() === ""
		);
	});

	// ----------------------------------------
	// Render

	return (
		<Switch>
			<Match when={hideIfEmpty()}>
				<span />
			</Match>
			<Match when={!hideIfEmpty()}>
				<DynamicContent
					state={{
						isError: folders.isError,
						isSuccess: folders.isSuccess,
					}}
					options={{
						padding: "24",
						inline: true,
					}}
					class="border-b border-border"
				>
					<Show when={props.state.parentFolderId() !== ""}>
						<li>
							<A href={"/admin/media"}>
								<span>root folder</span>
							</A>
						</li>
					</Show>
					<For each={folders.data?.data.breadcrumbs}>
						{(breadcrumb) => (
							<li>
								<A href={`/admin/media/${breadcrumb.id}`}>
									<span>{breadcrumb.title}</span>
								</A>
							</li>
						)}
					</For>
					<Grid
						state={{
							isLoading: folders.isLoading,
							totalItems: folders.data?.data.folders.length || 0,
						}}
						slots={{
							loadingCard: <MediaFolderCardLoading />,
						}}
					>
						<For each={folders.data?.data.folders}>
							{(folder) => (
								<li>
									<A
										href={`/admin/media/${folder.id}`}
										class="flex items-center gap-2 rounded-md border border-border p-3 hover:bg-muted/40"
									>
										<FaSolidFolder />
										<span class="text-sm font-medium">{folder.title}</span>
									</A>
								</li>
							)}
						</For>
					</Grid>
				</DynamicContent>
			</Match>
		</Switch>
	);
};
