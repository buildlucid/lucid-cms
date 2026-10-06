import type { RichTextJSON } from "@lucidcms/rich-text";
import type { Release } from "@types";
import { FaSolidPen } from "solid-icons/fa";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import Button from "@/components/Button/Button";
import { richTextHasContent } from "@/components/RichText/helpers";
import SectionHeading from "@/components/SectionHeading/SectionHeading";
import api from "@/services/api";
import T from "@/translations";
import { ReleaseRichTextContent } from "./ReleaseRichTextContent";
import { ReleaseRichTextEditor } from "./ReleaseRichTextEditor";

/**
 * The release's description. People who can edit the release write it in
 * the same box as comments, so they can mention people too. Saving it empty
 * clears it.
 */
export const ReleaseDescription: Component<{
	release: Release;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const [editing, setEditing] = createSignal(false);
	const [body, setBody] = createSignal<RichTextJSON>();

	// ----------------------------------------
	// Queries & Mutations
	const update = api.releases.useUpdateSingle({
		onSuccess: () => setEditing(false),
	});

	// ----------------------------------------
	// Memos
	const hasDescription = createMemo(() =>
		richTextHasContent(props.release.description ?? undefined),
	);

	// ----------------------------------------
	// Functions
	const startEditing = () => {
		setBody(props.release.description ?? undefined);
		update.reset();
		setEditing(true);
	};
	const save = () => {
		const value = body();
		update.action.mutate({
			id: props.release.id,
			body: {
				description: value && richTextHasContent(value) ? value : null,
			},
		});
	};
	//* editing ends when focus leaves without changes. The saved value is a
	//* store proxy, so compare text
	const closeIfUnchanged = () => {
		if (
			JSON.stringify(body() ?? null) ===
			JSON.stringify(props.release.description)
		) {
			setEditing(false);
		}
	};

	// ----------------------------------------
	// Render
	return (
		<section>
			<SectionHeading
				title={T()("releases.description.title")}
				actions={
					<Show when={props.release.permissions.edit && !editing()}>
						<Button
							variant="ghost"
							size="xs"
							shape="square"
							aria-label={T()("releases.description.edit")}
							title={T()("releases.description.edit")}
							onClick={startEditing}
						>
							<FaSolidPen size={10} />
						</Button>
					</Show>
				}
			/>
			<Show
				when={editing()}
				fallback={
					<Show
						when={hasDescription() ? props.release.description : undefined}
						fallback={
							<p class="text-sm text-muted">
								{T()("releases.description.empty")}
							</p>
						}
					>
						{(description) => (
							<ReleaseRichTextContent
								release={props.release}
								value={description()}
							/>
						)}
					</Show>
				}
			>
				<ReleaseRichTextEditor
					release={props.release}
					id="release-description"
					value={body()}
					onChange={setBody}
					onSubmit={save}
					submitting={update.action.isPending}
					submitLabel={T()("common.save")}
					placeholder={T()("releases.description.placeholder")}
					error={update.errors()?.message}
					allowEmpty={true}
					variant="inline"
					onFocusLeave={closeIfUnchanged}
					onEscape={() => setEditing(false)}
					onClose={() => setEditing(false)}
				/>
			</Show>
		</section>
	);
};
