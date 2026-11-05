export const previewProtocol = {
	scope: "lucid:builder-preview",
	version: 1,
} as const;

export const previewProtocolLimits = {
	pageKeyLength: 2048,
	requestIdLength: 128,
	collectionKeyLength: 128,
	brickKeyLength: 128,
	refLength: 128,
	localeLength: 64,
	pathDepth: 32,
	pathKeyLength: 128,
	repeaters: 4096,
	errors: 4096,
	//* text typed into a field on the page, or shown by the element being edited
	text: 65536,
} as const;
