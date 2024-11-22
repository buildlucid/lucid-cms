import { expect, test } from "vitest";
import T from "../../../translations/index.js";
import constants from "../../../constants/constants.js";
import CollectionBuilder from "../../../libs/builders/collection-builder/index.js";
import { validateField } from "../../../services/collection-document-bricks/checks/check-validate-bricks-fields.js";
import CustomFieldSchema from "../schema.js";
import LinkCustomField from "./link.js";

const CONSTANTS = {
	collectionBrickId: "collection-pseudo-brick",
};

// -----------------------------------------------
// Validation
const LinkCollection = new CollectionBuilder("collection", {
	mode: "multiple",
	details: {
		name: "Test",
		singularName: "Test",
	},
	config: {
		useTranslations: true,
	},
})
	.addLink("standard_link")
	.addLink("required_link", {
		validation: {
			required: true,
		},
	});

test("successfully validate field - link", async () => {
	// Standard
	const standardValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "standard_link",
			type: "link",
			value: {
				url: "https://example.com",
				target: "_blank",
				label: "Link 1",
			},
			localeCode: "en",
		},
		instance: LinkCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(standardValidate).toBe(null);

	// Required
	const requiredValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "required_link",
			type: "link",
			value: {
				url: "https://example.com",
				target: "_blank",
				label: "Link 1",
			},
			localeCode: "en",
		},
		instance: LinkCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(requiredValidate).toBe(null);
});

test("fail to validate field - link", async () => {
	// Standard
	const standardValidate = {
		url: validateField({
			brickId: CONSTANTS.collectionBrickId,
			field: {
				key: "standard_link",
				type: "link",
				value: {
					url: false, // invalid
					target: "_blank",
					label: "Link 1",
				},
				localeCode: "en",
			},
			instance: LinkCollection,
			data: {
				media: [],
				users: [],
				documents: [],
			},
		}),
		target: validateField({
			brickId: CONSTANTS.collectionBrickId,
			field: {
				key: "standard_link",
				type: "link",
				value: {
					url: "https://example.com",
					target: "test", // invalid
					label: "Link 1",
				},
				localeCode: "en",
			},
			instance: LinkCollection,
			data: {
				media: [],
				users: [],
				documents: [],
			},
		}),
		label: validateField({
			brickId: CONSTANTS.collectionBrickId,
			field: {
				key: "standard_link",
				type: "link",
				value: {
					url: "https://example.com",
					target: "_blank",
					label: false, // invalid
				},
				localeCode: "en",
			},
			instance: LinkCollection,
			data: {
				media: [],
				users: [],
				documents: [],
			},
		}),
	};
	expect(standardValidate).toEqual({
		url: {
			key: "standard_link",
			brickId: CONSTANTS.collectionBrickId,
			localeCode: "en",
			groupId: undefined,
			message: 'Expected string, received boolean at "url"', // zod error message
		},
		target: {
			key: "standard_link",
			brickId: CONSTANTS.collectionBrickId,
			localeCode: "en",
			groupId: undefined,
			message: T("field_link_target_error_message", {
				valid: constants.customFields.link.targets.join(", "),
			}),
		},
		label: {
			key: "standard_link",
			brickId: CONSTANTS.collectionBrickId,
			localeCode: "en",
			groupId: undefined,
			message: 'Expected string, received boolean at "label"', // zod error message
		},
	});

	// Required
	const requiredValidate = validateField({
		brickId: CONSTANTS.collectionBrickId,
		field: {
			key: "required_link",
			type: "link",
			value: undefined,
			localeCode: "en",
		},
		instance: LinkCollection,
		data: {
			media: [],
			users: [],
			documents: [],
		},
	});
	expect(requiredValidate).toEqual({
		key: "required_link",
		brickId: CONSTANTS.collectionBrickId,
		localeCode: "en",
		groupId: undefined,
		message: T("generic_field_required"),
	});
});

// -----------------------------------------------
// Custom field config
test("custom field config passes schema validation", async () => {
	const field = new LinkCustomField("field", {
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
		translations: true,
		default: {
			url: "https://example.com",
			label: "Link 1",
			target: "_blank",
		},
		hidden: false,
		disabled: false,
		validation: {
			required: true,
		},
	});

	const res = await CustomFieldSchema.safeParseAsync(field.config);
	expect(res.success).toBe(true);
});
