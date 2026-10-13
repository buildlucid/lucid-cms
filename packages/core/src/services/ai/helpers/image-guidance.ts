import z from "zod";

export const imageGuidanceSchema = z.enum([
	"natural",
	"lifestyle",
	"product",
	"illustration",
	"cinematic",
]);

type ImageGuidance = z.output<typeof imageGuidanceSchema>;

export const imageGuidanceInstructions: Record<ImageGuidance, string> = {
	natural:
		"Create a realistic photograph with natural light, believable texture, accurate perspective, and minimal stylization.",
	lifestyle:
		"Create a polished lifestyle image suited to a brand story or magazine article, with a real-world setting, composed framing, and natural lighting.",
	product:
		"Create a clean studio product image with crisp detail, controlled lighting, accurate materials, and minimal background distractions.",
	illustration:
		"Create a polished non-photographic illustration with clear shapes, cohesive colors, intentional texture, and no photorealistic camera effects.",
	cinematic:
		"Create a story-led cinematic image with dramatic composition, atmospheric lighting, depth, and a believable mood.",
};
