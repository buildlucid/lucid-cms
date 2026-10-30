import buildTableName from "../../../helpers/build-table-name.js";
import type { CanLinkTarget } from "../../types.js";
import type { RelationValidationData } from "./types.js";

/** Leaves out the documents `canLink` refuses. */
const restrictRelationValidationData = (
	documents: RelationValidationData[],
	canLink: CanLinkTarget,
) =>
	documents.filter((document) => {
		const table = buildTableName(
			"document",
			{ collection: document.collection_key },
			null,
		);
		return (
			!table.error &&
			canLink({
				resource: "documents",
				table: table.data.name,
				value: document.id,
			})
		);
	});

export default restrictRelationValidationData;
