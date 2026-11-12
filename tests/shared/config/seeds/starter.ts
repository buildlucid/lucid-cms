import type { TransferExportFile } from "@lucidcms/core/types";
import { files } from "#harness/config";
import { STORY_KEY } from "../collections/story.ts";

/** Starter content a seed imports: an image, and a story that shows it. */
export const STARTER = {
	mediaUid: "harness-starter-image",
	storyUid: "harness-starter-story",
	storyTitle: "Starter story",
	imagePath: "files/harness-starter-image.png",
	image: files.png({ width: 4, height: 4, shade: 30 }),
} as const;

const image = {
	uid: STARTER.mediaUid,
	file: STARTER.imagePath,
	fileName: "starter.png",
	mimeType: STARTER.image.mimeType,
	type: "image",
	size: STARTER.image.bytes.byteLength,
	public: true,
	folder: [],
	meta: {
		width: 4,
		height: 4,
		duration: null,
		focalPoint: null,
		blurHash: null,
		averageColor: null,
		base64: null,
		isDark: null,
		isLight: null,
	},
	text: { title: [{ localeCode: null, value: "Starter image" }] },
	url: null,
};

const story = {
	uid: STARTER.storyUid,
	collectionKey: STORY_KEY,
	label: STARTER.storyTitle,
	//* the source site's ID for the image, which the import links to the image it makes
	refs: { media: { "1": STARTER.mediaUid } },
	data: {
		fields: { title: STARTER.storyTitle, media: [1] },
		bricks: { fixed: {}, builder: [], embedded: [] },
	},
};

/** An export file as another site would have written it, with the image bundled beside it. */
export const starterFile = {
	lucid: { format: 1, version: "0.0.0" },
	source: {
		instanceId: "harness-starter-site",
		url: "https://starter.invalid",
	},
	exportedAt: "2026-01-01T00:00:00.000Z",
	locales: [],
	resources: { media: [image], documents: [story] },
} satisfies TransferExportFile;
