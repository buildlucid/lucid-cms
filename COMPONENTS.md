# Authoring exported admin components

How components in `packages/admin` are built when they are exported from
`@lucidcms/admin/components` for plugins and custom UI to use.

`components/Modal` is the reference implementation. When in doubt, copy it.

## The rule that drives everything

**We use what we export.** An exported component is the same one the admin uses
internally. There is no private variant and no privileged access.

So when a component becomes public:

- migrate **every** internal call site to it
- delete what it replaced — no adapters, no two APIs side by side
- if a convenience wrapper needs something the public parts do not expose, make
  that thing public or drop the wrapper

Components we do not plan to export can stay as they are, even if they are less
composable. Only pay this cost when something goes public.

## Three tiers

**Primitives.** Flat props, extend the underlying element's attributes, one
element. `Button`, `Link`.

**Parts.** Anything with regions ships as a dot-notation namespace, one file per
part under `parts/`. `Modal.Root`, `Modal.Header`, `Modal.Body`. Each part owns
its own spacing and borders so callers never re-implement them.

**Recipes.** A single component for a high-frequency case, built *only* from the
public parts. `Modal.Confirm`. Keep this list short. When a caller needs more
than the recipe offers, they drop to the parts — that is the escape hatch, not
another prop.

The test for a recipe: it must be implementable in a file that imports nothing
private. `Modal.Confirm` imports `ModalRoot`, `ModalHeader`, `ModalTitle`,
`ModalBody`, `ModalFooter`, `ModalActions` and nothing else from the system.

## Props

Flat. No `state`, `copy`, `callbacks`, `options` or `slots` grouping objects on a
public surface — they cannot be spread onto an element, they hide internal
plumbing, and they read like nothing else in the ecosystem.

- controlled state is `open` + `onOpenChange`, not `state={{ open, setOpen }}`
- booleans are positive and default to the common case: `dismissible` (default
  true), never `preventDismiss`
- a choice with more than two states is a string union, not a pile of booleans:
  `padding?: "none" | "md"`, `size?: "sm" | "md" | "lg"`
- every part takes `class`, merged last so callers can always override
- never leak editor plumbing (`fieldColumnIsMissing`, `altLocaleError`,
  `localised`) into a public component
- export the props type for every exported component, and any union type a prop
  uses (`ModalSize`, `ButtonVariant`)
- reuse existing types rather than inventing a parallel vocabulary —
  `confirmVariant?: ButtonVariant`, not a new `theme` union

Check spelling before publishing. Typos are forever once they are public.

## Reaching state from a parent's markup

A part can read context with a hook, but only when it runs inside the provider.
Content written in the same component as the root does not, because that JSX is
created in the parent's scope. When a component holds state its content needs —
the drawer's content locale, say — give it both:

- a hook (`useDrawerLocale`) for real child components
- an **optional** render prop on the root, for content written alongside it

Optional is the whole point. Type the children as a union and resolve it the
way Solid does, treating an arity of one as a render prop:

```tsx
children: JSXElement | ((locale: Accessor<string | undefined>) => JSXElement);
```

Call sites that do not need the value pass ordinary markup. `Panel` made its
render prop **mandatory**, so 15 of its 20 call sites wrote `{() => (...)}` to
ignore an argument they never used. That was the defect, not the render prop.

## Data attributes

Every part of an exported component carries a bare data attribute naming it, so
consumers can target it from a parent's CSS without depending on class names:

```tsx
<div data-modal-footer class={classNames("…", props.class)}>
```

Naming is `data-<component>-<part>`, kebab-case, no value: `data-modal-header`,
`data-modal-title`, `data-modal-actions`. Single-element components get
`data-button`, `data-link`. Put the attribute after any `{...rest}` spread so it
cannot be overwritten.

These are part of the public contract. Renaming one is a breaking change.

## Layering

Overlays read `PanelLayerContext` and provide their own layer to children, so
nesting works without callers threading z-index through props:

```tsx
const parentLayer = useContext(PanelLayerContext);
const layer = createMemo(() => props.zIndex ?? (parentLayer ? parentLayer() + 20 : 50));
```

Keep an explicit `zIndex` prop as an escape hatch. Never add a `nested` boolean.

## Accessibility

Use the Kobalte-backed part rather than raw markup — `Modal.Title` instead of an
`<h2>` — so `aria-labelledby` and friends are wired correctly. If a part exists
for it, hand-rolled markup is a bug.

## Docs

Every exported component gets a JSDoc block: two or three plain sentences saying
what it is and when to reach for something else, then one `@example` with a
short, realistic `tsx` snippet. That JSDoc is the only documentation a plugin
author gets, so hold the bar. No READMEs.

Prop-level comments go on the prop, with `@default` where there is one.

## Layout

```
components/Modal/
  Modal.tsx           namespace object + re-exported types
  ModalContext.ts     state shared with the parts
  parts/ModalRoot.tsx one part per file, PascalCase
```

Export from `src/exports/components.ts`. Keep the single entry point — no deep
import paths.

Internal translations use `T()` like the rest of the admin; `useTranslation` is
the hook plugins use.

## Before calling it done

- [ ] every internal call site migrated, old components deleted
- [ ] `npx biome check ./src` and `npx tsc --noEmit` clean in `packages/admin`
- [ ] `npm run build` in `packages/admin`, and the types and JSDoc appear in
      `dist/browser/components.d.mts`
- [ ] tests pass
- [ ] no dead props left behind on callers that fed a removed option
