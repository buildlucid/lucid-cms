import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";

export const extensions = [
	StarterKit.configure({
		link: {
			openOnClick: true,
		},
	}),
	Underline,
];
