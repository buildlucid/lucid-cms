import formatter from "./index.js";
import type { MediaFolderResponse } from "../../types/response.js";

export interface MediaFolderPropsT {
	id: number;
	title: string;
	parent_folder_id: number | null;
	folder_count?: number | null;
	media_count?: number | null;
	created_by: number | null;
	updated_by: number | null;
	created_at: Date | string | null;
	updated_at: Date | string | null;
}
interface MediaFolderBreadcrumbPropsT {
	id: number;
	title: string;
	parent_folder_id: number | null;
}
export interface MediaFolderWithHierarchyPropsT extends MediaFolderPropsT {
	level: number;
	order: number;
	label: string;
}

const formatBreadcrumbs = (props: {
	breadcrumbs: MediaFolderBreadcrumbPropsT[];
}) => {
	return props.breadcrumbs.map((b) => {
		return {
			id: b.id,
			title: b.title,
			parentFolderId: b.parent_folder_id,
		};
	});
};

const formatMultiple = (props: {
	folders: MediaFolderPropsT[] | MediaFolderWithHierarchyPropsT[];
}) => {
	return props.folders.map((f) =>
		formatSingle({
			folder: f,
		}),
	);
};

const formatSingle = (props: {
	folder: MediaFolderPropsT | MediaFolderWithHierarchyPropsT;
}): MediaFolderResponse => {
	let meta: MediaFolderResponse["meta"] | undefined;
	if (
		"level" in props.folder &&
		"order" in props.folder &&
		"label" in props.folder
	) {
		meta = {
			level: props.folder?.level,
			order: props.folder.order,
			label: props.folder.label,
		};
	}

	return {
		id: props.folder.id,
		title: props.folder.title,
		parentFolderId: props.folder.parent_folder_id,
		folderCount: props.folder.folder_count ?? 0,
		mediaCount: props.folder.media_count ?? 0,
		meta: meta,
		createdBy: props.folder.created_by,
		updatedBy: props.folder.updated_by,
		createdAt: formatter.formatDate(props.folder.created_at),
		updatedAt: formatter.formatDate(props.folder.updated_at),
	};
};

export default {
	formatBreadcrumbs,
	formatMultiple,
	formatSingle,
};
