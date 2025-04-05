import Formatter from "./index.js";
import constants from "../../constants/constants.js";
import type { Config, FieldResponse } from "../../types.js";

export default class DocumentFieldsFormatter {
	formatMultiple = (props: {
		config: Config;
	}): FieldResponse[] => {
		return [];
	};

	static swagger = {
		type: "object",
		additionalProperties: true,
		properties: {
			key: {
				type: "string",
			},
			type: {
				type: "string",
				enum: [
					"tab",
					"text",
					"wysiwyg",
					"media",
					"number",
					"checkbox",
					"select",
					"textarea",
					"json",
					"colour",
					"datetime",
					"link",
					"repeater",
					"user",
				],
			},
			groupId: {
				type: "number",
				nullable: true,
			},
			collectionDocumentId: {
				type: "number",
			},
			translations: {
				type: "object",
				additionalProperties: true,
			},
			value: {},
			meta: {
				type: "object",
				additionalProperties: true,
				nullable: true,
				properties: {
					id: {
						type: "number",
						nullable: true,
					},
					url: {
						type: "string",
						nullable: true,
					},
					key: {
						type: "string",
						nullable: true,
					},
					mimeType: {
						type: "string",
						nullable: true,
					},
					extension: {
						type: "string",
						nullable: true,
					},
					fileSize: {
						type: "number",
						nullable: true,
					},
					width: {
						type: "number",
						nullable: true,
					},
					height: {
						type: "number",
						nullable: true,
					},
					blurHash: {
						type: "string",
						nullable: true,
					},
					averageColour: {
						type: "string",
						nullable: true,
					},
					isDark: {
						type: "boolean",
						nullable: true,
					},
					isLight: {
						type: "boolean",
						nullable: true,
					},
					title: {
						type: "object",
						additionalProperties: true,
					},
					alt: {
						type: "object",
						additionalProperties: true,
					},
					type: {
						type: "string",
						nullable: true,
						enum: ["image", "video", "audio", "document"],
					},
					email: {
						type: "string",
						nullable: true,
					},
					username: {
						type: "string",
						nullable: true,
					},
					firstName: {
						type: "string",
						nullable: true,
					},
					lastName: {
						type: "string",
						nullable: true,
					},
					fields: {
						type: "object",
						additionalProperties: true,
						nullable: true,
					},
				},
			},
			groups: {
				type: "array",
				items: {
					type: "object",
					additionalProperties: true,
					properties: {
						id: {
							type: "number",
						},
						order: {
							type: "number",
						},
						open: {
							type: "boolean",
							nullable: true,
						},
						fields: {
							type: "array",
							items: {
								type: "object",
								additionalProperties: true,
							},
						},
					},
				},
			},
		},
	};
}
