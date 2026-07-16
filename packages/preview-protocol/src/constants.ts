export const previewProtocol = {
	scope: "lucid:builder-preview",
	version: 1,
	messages: {
		ready: "ready",
		connect: "connect",
		captureScroll: "capture-scroll",
		scrollState: "scroll-state",
		restoreScroll: "restore-scroll",
		focusField: "focus-field",
	},
} as const;

export const previewFieldAttribute = "data-lucid-preview-field" as const;

export const previewFieldAttributePrefix = `${previewProtocol.version}:`;

export const previewProtocolLimits = {
	attributeLength: 4096,
	pageKeyLength: 2048,
	requestIdLength: 128,
	collectionKeyLength: 128,
	brickKeyLength: 128,
	localeLength: 64,
	pathDepth: 32,
	pathKeyLength: 128,
} as const;
