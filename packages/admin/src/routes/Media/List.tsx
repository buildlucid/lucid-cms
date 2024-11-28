import T from "@/translations";
import { type Component, createSignal } from "solid-js";
import useSearchParamsLocation from "@/hooks/useSearchParamsLocation";
import userStore from "@/store/userStore";
import api from "@/services/api";
import { Wrapper } from "@/components/Groups/Layout";
import { Standard } from "@/components/Groups/Headers";
import { MediaList } from "@/components/Groups/Content";
import Alert from "@/components/Blocks/Alert";
import CreateUpdateMediaPanel from "@/components/Panels/Media/CreateUpdateMediaPanel";
import { QueryRow } from "@/components/Groups/Query";

const MediaListRoute: Component = () => {
	// ----------------------------------
	// Hooks & State
	const searchParams = useSearchParamsLocation(
		{
			filters: {
				title: {
					value: "",
					type: "text",
				},
				extension: {
					value: "",
					type: "text",
				},
				type: {
					value: "",
					type: "array",
				},
				mimeType: {
					value: "",
					type: "text",
				},
				key: {
					value: "",
					type: "text",
				},
			},
			sorts: {
				fileSize: undefined,
				title: undefined,
				width: undefined,
				height: undefined,
				mimeType: undefined,
				extension: undefined,
				createdAt: undefined,
				updatedAt: "desc",
			},
			pagination: {
				perPage: 20,
			},
		},
		{
			singleSort: true,
		},
	);
	const [getOpenCreateMediaPanel, setOpenCreateMediaPanel] =
		createSignal<boolean>(false);

	// ----------------------------------------
	// Queries / Mutations
	const settings = api.settings.useGetSettings({
		queryParams: {},
	});

	// ----------------------------------------
	// Render
	return (
		<Wrapper
			slots={{
				topBar: (
					<Alert
						style="layout"
						alerts={[
							{
								type: "warning",
								message: T()("media_support_config_stategy_error"),
								show: settings.data?.data.media.enabled === false,
							},
						]}
					/>
				),
				header: (
					<Standard
						copy={{
							title: T()("media_route_title"),
							description: T()("media_route_description"),
						}}
						actions={{
							create: {
								open: getOpenCreateMediaPanel(),
								setOpen: setOpenCreateMediaPanel,
								permission: userStore.get.hasPermission(["create_media"]).all,
							},
							contentLocale: true,
						}}
						slots={{
							bottom: (
								<QueryRow
									searchParams={searchParams}
									filters={[
										{
											label: T()("title"),
											key: "title",
											type: "text",
										},
										{
											label: T()("mime_type"),
											key: "mimeType",
											type: "text",
										},
										{
											label: T()("key"),
											key: "key",
											type: "text",
										},
										{
											label: T()("type"),
											key: "type",
											type: "multi-select",
											options: [
												{
													label: T()("image"),
													value: "image",
												},
												{
													label: T()("video"),
													value: "video",
												},
												{
													label: T()("audio"),
													value: "audio",
												},
												{
													label: T()("document"),
													value: "document",
												},
												{
													label: T()("archive"),
													value: "archive",
												},
												{
													label: T()("unknown"),
													value: "unknown",
												},
											],
										},
										{
											label: T()("file_extension"),
											key: "extension",
											type: "text",
										},
									]}
									sorts={[
										{
											label: T()("title"),
											key: "title",
										},
										{
											label: T()("file_size"),
											key: "fileSize",
										},
										{
											label: T()("mime_type"),
											key: "mimeType",
										},
										{
											label: T()("file_extension"),
											key: "extension",
										},
										{
											label: T()("width"),
											key: "width",
										},
										{
											label: T()("height"),
											key: "height",
										},
										{
											label: T()("created_at"),
											key: "createdAt",
										},
										{
											label: T()("updated_at"),
											key: "updatedAt",
										},
									]}
									perPage={[10, 20, 40]}
								/>
							),
						}}
					/>
				),
			}}
		>
			<MediaList
				state={{
					searchParams: searchParams,
					setOpenCreateMediaPanel: setOpenCreateMediaPanel,
				}}
			/>
			<CreateUpdateMediaPanel
				state={{
					open: getOpenCreateMediaPanel(),
					setOpen: setOpenCreateMediaPanel,
				}}
			/>
		</Wrapper>
	);
};

export default MediaListRoute;
