import { defineAdminSlot } from "@lucidcms/core";
import {
	COMPONENTS_MODULE,
	PLUGIN_KEY,
	SUBMISSIONS_COLLECTION_KEY,
	submissionFields,
} from "../../../constants.js";

/** Shows a submission's answers as a list people can read, in place of the JSON they are stored as. */
const submissionAnswersConfig = () =>
	defineAdminSlot({
		key: `${PLUGIN_KEY}:submission-answers`,
		slot: "field.input",
		match: {
			collection: SUBMISSIONS_COLLECTION_KEY,
			kind: "collection-fields",
			field: submissionFields.values,
			fieldType: "json",
		},
		component: { module: COMPONENTS_MODULE, export: "SubmissionAnswers" },
	});

export default submissionAnswersConfig;
