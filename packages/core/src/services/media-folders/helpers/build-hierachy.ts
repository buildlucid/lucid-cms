import type {
	MediaFolderPropsT,
	MediaFolderWithHierarchyPropsT,
} from "../../../libs/formatters/media-folders.js";

/**
 * Builds a hierarchy of media folders
 */
const buildHierarchy = (
	folders: MediaFolderPropsT[],
): MediaFolderWithHierarchyPropsT[] => {
	const orderedFolders: MediaFolderWithHierarchyPropsT[] = [];
	let orderCounter = 0;

	const processFolder = (folder: MediaFolderPropsT, level: number) => {
		const prefix = "-".repeat(level);
		const label = level > 0 ? `${prefix} ${folder.title}` : folder.title;

		orderedFolders.push({
			...folder,
			level,
			order: orderCounter++,
			label,
		});

		const children = folders
			.filter((f) => f.parent_folder_id === folder.id)
			.sort((a, b) => a.title.localeCompare(b.title));

		for (const child of children) {
			processFolder(child, level + 1);
		}
	};

	const rootFolders = folders
		.filter((f) => f.parent_folder_id === null)
		.sort((a, b) => a.title.localeCompare(b.title));

	for (const folder of rootFolders) {
		processFolder(folder, 0);
	}

	return orderedFolders;
};

export default buildHierarchy;
