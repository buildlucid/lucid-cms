export default {
	documentationUrl: "https://lucidjs.build/en/cms/docs",
	cmsMarketingPage: "https://lucidjs.build/en/cms",
	lucidRemote: {
		website: "https://lucidjs.build/en",
	},
	/** The longest return path a login can send to the server. Matches core's `adminRedirectPathSchema`. */
	redirectPathMaxLength: 2048,
	errorQueryParams: {
		errorName: "errorName",
		errorMessage: "errorMessage",
	},
	/** Matches core's `constants.magicLink`. */
	magicLink: {
		codeLength: 6,
		resendCooldownSeconds: 60,
	},
	/** Matches core's `constants.twoFactor`. */
	twoFactor: {
		codeLength: 6,
		recoveryCodeCount: 10,
		recoveryCodeLength: 10,
		/** Fewer recovery codes than this left shows a warning on the account page. */
		lowRecoveryCodes: 3,
	},
	/** Matches core's `constants.passkeys`. */
	passkeys: {
		maxPerUser: 10,
		nameMaxLength: 50,
		/** Days "Not now" hides the prompt to add a passkey after logging in, on this browser. */
		promptSnoozeDays: 30,
	},
	/** How long preloaded data stays fresh, so opening a link soon after hovering it doesn't fetch it again. */
	preloadStaleTime: 10_000,
};
