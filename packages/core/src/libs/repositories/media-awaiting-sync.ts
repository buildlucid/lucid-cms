import type { LucidDatabase } from "../db/client/index.js";
import { mediaAwaitingSyncTable } from "../db/tables/media-awaiting-sync.js";
import StaticRepository from "./parents/static-repository.js";

export default class MediaAwaitingSyncRepository extends StaticRepository<"lucid_media_awaiting_sync"> {
	constructor(db: LucidDatabase) {
		super(db, mediaAwaitingSyncTable);
	}
}
