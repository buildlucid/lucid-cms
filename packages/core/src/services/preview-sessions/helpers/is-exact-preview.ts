import constants from "../../../constants/constants.js";
import type { DocumentVersionType } from "../../../types.js";

/** Exact previews are pinned to one revision or snapshot entry version. */
const isExactPreview = (versionType: DocumentVersionType) =>
	versionType === "revision" ||
	versionType === constants.collectionBuilder.publishing.snapshotVersionType;

export default isExactPreview;
