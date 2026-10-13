import z from "zod";

export const inputSchema = z
	.object({
		mediaId: z.number().int().positive().meta({
			description:
				"ID of personal media of the person you act for, such as a chat upload.",
		}),
		public: z.boolean().default(true).meta({
			description:
				"Whether anyone can open the file without signing in. Pages need public media.",
		}),
		title: z.string().trim().max(255).optional().meta({
			description:
				"A title for the media library, in the default content language.",
		}),
		alt: z.string().trim().max(1000).optional().meta({
			description: "Alt text for an image, in the default content language.",
		}),
	})
	.strict();

export const outputSchema = z.object({
	media: z
		.object({
			id: z.number().meta({ description: "Media ID." }),
			public: z
				.boolean()
				.meta({ description: "Whether public delivery is enabled." }),
		})
		.meta({ description: "The media added to the library." }),
});
