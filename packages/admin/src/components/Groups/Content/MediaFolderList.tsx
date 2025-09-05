import { type Accessor, type Component, For } from "solid-js";
import api from "@/services/api";
import { DynamicContent } from "@/components/Groups/Layout";
import { Grid } from "@/components/Groups/Grid";
import { A } from "@solidjs/router";
import { FaSolidFolder } from "solid-icons/fa";
import { MediaFolderCardLoading } from "@/components/Cards/MediaFolderCard";
import { Breadcrumbs } from "@/components/Groups/MediaLibrary";
import T from "@/translations";
import { Checkbox } from "@/components/Groups/Form";

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
	// Render

	return (
		<DynamicContent
			state={{
				isSuccess: folders.isSuccess,
			}}
			options={{
				padding: "24",
				inline: true,
			}}
			class="pb-0!"
		>
			<h3 class="mb-1">{T()("folders")}</h3>
			<Breadcrumbs
				state={{
					parentFolderId: props.state.parentFolderId,
					breadcrumbs: folders.data?.data.breadcrumbs ?? [],
				}}
			/>
			<Grid
				state={{
					isLoading: folders.isLoading,
					totalItems: folders.data?.data.folders.length || 0,
				}}
				slots={{
					loadingCard: <MediaFolderCardLoading />,
				}}
				class="border-b border-border pb-6"
			>
				<For each={folders.data?.data.folders}>
					{(folder) => (
						<li>
							<A
								href={`/admin/media/${folder.id}`}
								class="flex items-start gap-3 rounded-md border border-border p-3 bg-card-base hover:bg-card-hover"
							>
								<Checkbox
									value={false}
									onChange={() => {}}
									copy={{}}
									theme="fit"
									noMargin={true}
								/>
								<div class="w-full flex flex-col -mt-px">
									<div class="flex items-center gap-2 mb-1">
										<FaSolidFolder size={18} />
										<p class="text-sm font-medium text-title">{folder.title}</p>
									</div>
									<p class="text-sm text-body">2 folders, 13 assets</p>
								</div>
							</A>
						</li>
					)}
				</For>
			</Grid>
		</DynamicContent>
	);
};
