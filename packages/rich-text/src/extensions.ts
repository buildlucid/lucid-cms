import type { Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

export const extensions: Extensions = [
	StarterKit.configure({
		link: {
			openOnClick: true,
		},
	}),
];
