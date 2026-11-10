# Lucid CMS - React for the site plugin

> **Experimental:** this package is new and may have breaking changes in any release, including minor ones. Check the changelog before you upgrade.

Renders React components from the site plugin's Kiln templates, on the server only or hydrated in the browser, with Fast Refresh in development.

## Installation

```bash
npm install @lucidcms/site-react react react-dom
```

## Setup

```typescript
import { site } from "@lucidcms/site";
import { react } from "@lucidcms/site-react";

site({ ui: [react()] });
```

Templates name components by file, relative to the site folder. A `client` prop of `"load"`, `"idle"`, `"visible"` or `{ media: "…" }` hydrates the component in the browser; without one it renders on the server only.

```twig
{% component "components/Counter.tsx" with { start: 3, client: "visible" } %}
	<p>Passed in as children</p>
{% endcomponent %}
```

With another JSX library, such as Solid, give one of them `include`, such as `react({ include: ["components/react/**"] })`.
