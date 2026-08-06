import type { LucidDatabase } from "../db/client/index.js";
import { mediaUploadSessionsTable } from "../db/tables/media-upload-sessions.js";
import StaticRepository from "./parents/static-repository.js";

export default class MediaUploadSessionsRepository extends StaticRepository<"lucid_media_upload_sessions"> {
	constructor(db: LucidDatabase) {
		super(db, mediaUploadSessionsTable);
	}
}
