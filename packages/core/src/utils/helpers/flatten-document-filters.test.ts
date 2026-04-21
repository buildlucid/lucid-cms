import { expect, test } from "vitest";
import flattenDocumentFilters from "./flatten-document-filters.js";

test("flattens nested document filter objects into Lucid's dotted query keys", () => {
	expect(
		flattenDocumentFilters({
			id: {
				value: 1,
			},
			_fullSlug: {
				value: "/about",
			},
			fields: {
				sections: {
					_section_title: {
						value: "Hero",
					},
				},
			},
			banner: {
				_title: {
					value: "About us",
				},
				call_to_actions: {
					_label: {
						value: "Read more",
					},
				},
			},
		}),
	).toEqual({
		id: {
			value: 1,
		},
		_fullSlug: {
			value: "/about",
		},
		"fields.sections._section_title": {
			value: "Hero",
		},
		"banner._title": {
			value: "About us",
		},
		"banner.call_to_actions._label": {
			value: "Read more",
		},
	});
});
