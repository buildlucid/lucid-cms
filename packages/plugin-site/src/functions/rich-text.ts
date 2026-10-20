import type { RichTextJSON } from "@lucidcms/rich-text";
import { generateHTML } from "@lucidcms/rich-text/server";
import { type Markup, safe } from "@lucidkiln/core";
import isRecord from "../utils/is-record.js";

/** Renders rich text fields or nodes as HTML; loop over `content` to render embedded bricks (`attrs.brick`) and linked documents (`attrs.document`) with templates, passing other nodes here. */
const richText = (node: RichTextJSON | null | undefined): Markup =>
	isRecord(node) ? safe(generateHTML(node)) : safe("");

export default richText;
