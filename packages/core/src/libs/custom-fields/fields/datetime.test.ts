import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import z from "zod";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import { validateField } from "../../../services/collection-document-bricks/checks/check-validate-bricks-fields.js";
import CustomFieldSchema from "../schema.js";
import DatetimeCustomField from "./datetime.js";

const CONSTANTS = {
	collectionBrickId: "collection-pseudo-brick",
};

// -----------------------------------------------
// Validation
const DateTimeCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		name: "Test",
		singularName: "Test",
	},
	config: {
		useTranslations: true,
	},
})
	.addDateTime("standard_datetime")
	.addDateTime("required_datetime", {
		validation: {
			required: true,
		},
	});

test("successfully validate field - datetime", async () => {
	// Standard
	const standardValidate = {
		string: validateField({
			brickId: CONSTANTS.collectionBrickId,
			field: {
				key: "standard_datetime",
				type: "datetime",
				value: "2024-06-15T14:14:21.704Z",
				localeCode: "en",
			},
			instance: DateTimeCollection,
			data: {
				media: [],
				users: [],
				documents: [],
			},
		}),
		number: validateField({
			brickId: CONSTANTS.collectionBrickId,
			field: {
				key: "standard_datetime",
				type: "datetime",
				value: 1676103221704,
				localeCode: "en",
			},
			instance: DateTimeCollection,
			data: {
				media: [],
				users: [],
				documents: [],
			},
		}),
		date: validateField({
			brickId: CONSTANTS.collectionBrickId,
			field: {
				key: "standard_datetime",
				type: "datetime",
				value: new Date("2024-06-15T14:14:21.704Z"),
				localeCode: "en",
			},
			instance: DateTimeCollection,
			data: {
				media: [],
				users: [],
				documents: [],
			},
		}),
	};
	expect(standardValidate).toEqual({
		date: null,
		number: null,
		string: null,
	});

	// Required
	const requiredValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "required_datetime",
			type: "datetime",
			value: "2024-06-15T14:14:21.704Z",
			localeCode: "en",
		},
		instance: DateTimeCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(requiredValidate).toBe(null);
});

test("fail to validate field - datetime", async () => {
	// Standard
	const standardValidate = {
		boolean: validateField({
			brickId: CONSTANTS.collectionBrickId,
			field: {
				key: "standard_datetime",
				type: "datetime",
				value: true,
				localeCode: "en",
			},
			instance: DateTimeCollection,
			data: {
				media: [],
				users: [],
				documents: [],
			},
		}),
		string: validateField({
			brickId: CONSTANTS.collectionBrickId,
			field: {
				key: "standard_datetime",
				type: "datetime",
				value: "string",
				localeCode: "en",
			},
			instance: DateTimeCollection,
			data: {
				media: [],
				users: [],
				documents: [],
			},
		}),
		invalid: validateField({
			brickId: CONSTANTS.collectionBrickId,
			field: {
				key: "standard_datetime",
				type: "datetime",
				value: "20024-06-15T14:14:21.704",
				localeCode: "en",
			},
			instance: DateTimeCollection,
			data: {
				media: [],
				users: [],
				documents: [],
			},
		}),
	};
	expect(standardValidate).toEqual({
		boolean: {
			key: "standard_datetime",
			brickId: CONSTANTS.collectionBrickId,
			localeCode: "en",
			groupId: undefined,
			message:
				"Expected string, received boolean, or Expected number, received boolean, or Expected date, received boolean", // zod error message
		},
		string: {
			key: "standard_datetime",
			brickId: CONSTANTS.collectionBrickId,
			localeCode: "en",
			groupId: undefined,
			message: T("field_date_invalid"),
		},
		invalid: {
			key: "standard_datetime",
			brickId: CONSTANTS.collectionBrickId,
			localeCode: "en",
			groupId: undefined,
			message: T("field_date_invalid"),
		},
	});

	// Required
	const requiredValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "required_datetime",
			type: "datetime",
			value: "",
			localeCode: "en",
		},
		instance: DateTimeCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(requiredValidate).toEqual({
		key: "required_datetime",
		brickId: CONSTANTS.collectionBrickId,
		localeCode: "en",
		groupId: undefined,
		message: T("generic_field_required"),
	});
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new DatetimeCustomField("field", {
		labels: {
			title: {
				en: "title",
			},
			description: {
				en: "description",
			},
			placeholder: {
				en: "placeholder",
			},
		},
		useTranslations: true,
		default: "2024-06-15T14:14:21.704Z",
		hidden: false,
		disabled: false,
		validation: {
			required: true,
			zod: z.date().min(new Date("2024-06-15T14:14:21.704Z")),
		},
	});

	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});
