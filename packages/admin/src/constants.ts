export default {
	documentationUrl: "https://lucidjs.build/en/cms/docs",
	cmsMarketingPage: "https://lucidjs.build/en/cms",
	lucidRemote: {
		website: "https://lucidjs.build/en",
	},
	errorQueryParams: {
		errorName: "errorName",
		errorMessage: "errorMessage",
	},
	/** Matches core's `constants.magicLink`. */
	magicLink: {
		codeLength: 6,
		resendCooldownSeconds: 60,
	},
	/** How long preloaded data stays fresh, so opening a link soon after hovering it doesn't fetch it again. */
	preloadStaleTime: 10_000,
};
