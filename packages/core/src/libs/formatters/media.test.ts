import { describe, expect, it } from "vitest";
import mediaFormatter, {
	type MediaFormatterOptions,
	type MediaPropsT,
} from "./media.js";

const options: MediaFormatterOptions = {
	host: "https://example.com",
	delivery: {
		type: "media-delivery-adapter",
		key: "passthrough",
		resolveFile: () => ({ type: "lucid" }),
	},
	imagePresets: {},
};

const media = {
	id: 1,
	key: "public/image",
	status: "ready",
	storage_adapter_key: "file-system",
	storage_adapter_reference: null,
	storage_adapter_data: null,
	public: 1,
	origin: "human",
	type: "image",
	mime_type: "image/png",
	file_extension: "png",
	file_name: "Image.png",
	file_size: 100,
	width: 100,
	height: 100,
	focal_x: null,
	focal_y: null,
	blur_hash: null,
	average_color: null,
	is_dark: null,
	is_light: null,
	parent_media_id: null,
	relation_type: null,
	e_tag: null,
	created_at: null,
	updated_at: null,
	folder_id: null,
	is_deleted: 0,
	is_deleted_at: null,
	deleted_by: null,
} satisfies MediaPropsT;

describe("media formatter translations", () => {
	it("returns null when media has no translation rows", () => {
		const result = mediaFormatter.formatSingle({ media, options });

		expect(result.title).toBeNull();
		expect(result.type === "image" ? result.alt : undefined).toBeNull();
	});

	it("preserves locale maps and explicit null values", () => {
		const result = mediaFormatter.formatSingle({
			media: {
				...media,
				translations: [
					{
						locale_code: "en",
						title: "Image",
						alt: null,
					},
				],
			},
			options,
		});

		expect(result.title).toEqual({ en: "Image" });
		expect(result.type === "image" ? result.alt : undefined).toEqual({
			en: null,
		});
	});
});
