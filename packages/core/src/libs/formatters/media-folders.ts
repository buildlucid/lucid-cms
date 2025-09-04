import Formatter from "./index.js";
import type { MediaFolderResponse } from "../../types/response.js";

interface MediaFolderPropsT {
	id: number;
	title: string;
	parent_folder_id: number | null;
	created_by: number | null;
	updated_by: number | null;
	created_at: Date | string | null;
	updated_at: Date | string | null;
}

export default class MediaFoldersFormatter {
	formatMultiple = (props: { folders: MediaFolderPropsT[] }) => {
		return props.folders.map((f) =>
			this.formatSingle({
				folder: f,
			}),
		);
	};
	formatSingle = (props: {
		folder: MediaFolderPropsT;
	}): MediaFolderResponse => {
		return {
			id: props.folder.id,
			title: props.folder.title,
			parentFolderId: props.folder.parent_folder_id,
			createdBy: props.folder.created_by,
			updatedBy: props.folder.updated_by,
			createdAt: Formatter.formatDate(props.folder.created_at),
			updatedAt: Formatter.formatDate(props.folder.updated_at),
		};
	};
}
