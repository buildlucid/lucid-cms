import type { LucidDatabase } from "../db/client/index.js";
import { previewSessionsTable } from "../db/tables/preview-sessions.js";
import StaticRepository from "./parents/static-repository.js";

export default class PreviewSessionsRepository extends StaticRepository<"lucid_preview_sessions"> {
	constructor(db: LucidDatabase) {
		super(db, previewSessionsTable);
	}
}
