export const lucidRemotePaths = {
	agent: "/v1/cms/ai/agent",
	getModels: "/v1/cms/ai/models",
	generateCmsAi: "/v1/cms/ai/generate",
	getCmsAiRequest: "/v1/cms/ai/requests",
	getCmsAiMedia: "/v1/cms/ai/media",
	getCredits: "/v1/cms/credits",
	submitBugReport: "/v1/cms/bug-reports",
	getAnnouncements: "/v1/cms/announcements",
	/** Everyone's announcements, for CMSs that aren't connected. */
	getPublicAnnouncements: "/v1/announcements",
} as const;
