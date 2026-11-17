# Lucid CMS - Forms Plugin

> The official forms plugin for Lucid

> **Experimental:** this package is new and may have breaking changes in any release, including minor ones. Check the changelog before you upgrade.

Adds forms your website can show and send. Define them in code or let editors build them, and each submission is checked on the server, protected from spam, emailed, stored and announced to your team.

## Installation

```bash
npm install @lucidcms/forms
```

## Setup

Add the plugin to your Lucid config. With no options it adds a Forms collection for editors and a Submissions collection.

```typescript
import { defineConfig } from "@lucidcms/core";
import { defineForm, formField, forms } from "@lucidcms/forms";
import { node } from "@lucidcms/node";
import { sqlite } from "@lucidcms/sqlite";

const contact = defineForm({
  key: "contact",
  name: "Contact",
  fields: [
    formField.text("name", { label: "Name", required: true, width: 6 }),
    formField.email("email", { label: "Email", required: true, width: 6 }),
    formField.textarea("message", { label: "Message", required: true }),
  ],
  emails: [
    {
      to: "team@example.com",
      subject: "Enquiry from {{name}}",
      replyTo: "{{email}}",
    },
  ],
});

export default defineConfig({
  runtime: node,
  db: sqlite,
  config: () => ({
    url: "https://cms.example.com",
    plugins: [forms({ definitions: [contact] })],
  }),
});
```

The plugin registers its admin components, translations and email template automatically.

## Configuration

| Property                    | Type                                           | Description                                                                         |
| --------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| `forms`                     | `FormDefinition[]`                             | Forms defined in code with `defineForm`.                                            |
| `builder`                   | `boolean \| FormsBuilderOptions`               | The collection editors build forms in. On by default. `false` turns it off.         |
| `builder.localized`         | `CollectionLocalizationConfig`                 | Translate labels, messages and choices. Defaults to `false`.                        |
| `builder.publishing`        | `CollectionPublishingOptions`                  | Environments, review and workflow for forms, as on any collection.                  |
| `builder.version`           | `string`                                       | The version websites get. Defaults to the last environment, or `latest`.            |
| `submissions`               | `boolean \| FormsSubmissionsOptions`           | The collection submissions are stored in. On by default. `false` never stores them. |
| `submissions.retentionDays` | `number \| false`                              | Days to keep submissions unless a form sets its own. Defaults to `false`.           |
| `fieldTypes`                | `FormFieldTypeDefinition[]`                    | Your own field types, made with `defineFormFieldType`.                              |
| `rateLimit`                 | `false \| { limit: number; windowMs: number }` | Submissions per IP address. Defaults to 10 a minute. Needs a KV adapter.            |

## Fields and layout

A form is a list of fields. Each has a `name`, which keys its answer in submissions and is its `{{name}}` token in emails, and a `width` of 12, 8, 6, 4 or 3 columns on a 12-column grid, so two fields of width 6 sit side by side.

The built-in types are text, long text, email, phone, web address, number, dropdown, radio buttons, checkboxes, checkbox, date, file upload and hidden value. In code they are `formField.text`, `formField.select` and so on. In the Forms collection each is a builder brick, so editors add, remove and reorder fields one at a time and see the form in the builder's preview as they go.

Add your own with `defineFormFieldType`. It names the control to draw, any extra settings editors fill in, and the schema an answer must pass:

```typescript
const rating = defineFormFieldType({
  key: "rating",
  label: "Rating",
  control: "number",
  settings: [field.number("max", { default: 5 })],
  schema: (formField) =>
    z.coerce
      .number()
      .int()
      .min(1)
      .max(Number(formField.settings.max ?? 5)),
});

forms({ fieldTypes: [rating] });
```

## Showing a form

Websites read a form at `/api/v1/content/e/forms/<key>` and post it to `/api/v1/content/e/forms/<key>/submit`. Both routes are public. The form a website gets leaves out recipients and everything else it shouldn't see. On the server, `toolkit.forms.get({ key })` returns the same.

A form is plain, accessible HTML with no styles, followed by a small inline script that sends it in place and shows errors beside their fields. With the site plugin, add the forms extension and call `form()` in a template, which draws the form in the page's locale:

```typescript
import { formsSite } from "@lucidcms/forms/site";

site({ kiln: { extensions: [formsSite()] } });
```

```twig
{{ form("contact") }}
```

On your own server, `toolkit.forms.render` writes the same HTML. In the browser, or from a form you fetched, use `renderForm`:

```typescript
const html = await toolkit.forms.render({ key: "contact", locale: "fr" });
```

```typescript
import { renderForm } from "@lucidcms/forms/browser";

const html = renderForm(form);
```

Without the script, the browser posts the form itself and is sent back to the page with `?form=<key>&status=sent`, or `status=error`, which `renderForm` takes as its `status` option. When your website and CMS are on different origins, give `renderForm` the page as `returnUrl`.

Style the form through its data attributes, such as `data-field`, `data-width` (out of 12 columns) and `data-error`. The script is the same for every form, so a Content Security Policy needs one hash for it. To use your own instead, pass `script: false` and post the form with `Accept: application/json`. Refused answers come back in `errors.values`, keyed by field name. Browsers posting from another origin need it in your config's `http.security.cors.origin`. In the builder, a form's preview toolbar shows its markup with an example script.

## Your own field markup

Give a field type a `render` to draw its fields your own way. It gets the field and the pieces of its built-in markup: ids, the label with its required mark, help and error elements, and the built-in markup itself to wrap. Keep `error` and the ids, so the label and the script still find the field.

```typescript
const rating = defineFormFieldType({
  key: "rating",
  label: "Rating",
  control: "number",
  schema: () => z.coerce.number().int().min(1).max(5),
  render: (field, parts) =>
    `<fieldset${parts.wrapper}><legend>${parts.label}</legend>…${parts.error}</fieldset>`,
});
```

`form()`, `toolkit.forms.render` and the builder use it. With `renderForm`, or to change a built-in type such as `select`, pass renderers by type key in `fields`, which `formsSite({ fields })` takes too.

## Environments

Set `builder: { publishing }` to give forms environments, as on any collection. Websites get `builder.version`, the last environment by default, and can read and post a form from another with `?version=`, or `version` on `toolkit.forms.get`. `form()` uses the site's own. Each submission records the environment its form came from.

## Translations

Set `builder: { localized: true }` to translate a form's labels, help text, choices, messages and emails. In code, give any of that text as a string, or one per locale: `label: { en: "Your name", fr: "Votre nom" }`. Locales without their own use the default locale's. Websites read a form in a locale with `?locale=`, or `locale` on `toolkit.forms.get`.

## Submissions

Each submission is stored as a document in the Submissions collection, with its answers, the labels its fields had at the time, a status and the emails it sent. People with access to the collection are notified. Turn either off for a form with `store: false` or `notify: false`, or in the form's settings in the builder.

A form's sidebar exports its submissions as CSV. `retentionDays`, on the plugin or a form, deletes older submissions and their files once a day.

## Emails

A form sends each of its `emails` for every submission, with the answers beneath an optional message. `to`, `subject`, `message` and `replyTo` take `{{name}}` tokens, so `to: "{{email}}"` replies to the visitor. To change how they look, add your own `forms-submission.kiln` to your project's emails folder.

Lucid keeps sent emails in its email log. For a form with `store: false` the answers are left out of the logged email, but its subject and recipients are kept, so leave tokens out of those if nothing should be kept.

## Spam protection

Every form has a honeypot field, unless it sets `honeypot: false`, such as a form behind a login. The submit route is rate limited per IP address, which needs a KV adapter to count with. When your project has a captcha adapter, forms check a token too, unless a form sets `captcha: false`. With the script, forms draw the captcha adapter's widget from `toolkit.captcha.renderWidget`, so add your website's hostname to the captcha key's domains and allow the provider in your Content Security Policy. With `script: false`, draw a widget yourself and have it write its token to a `_captcha` input, such as Turnstile's `data-response-field-name="_captcha"`.

## File uploads

`formField.upload` takes files, checked against the field's `accept` extensions, `maxFiles` and `maxSizeMb` before anything is stored. Files are kept as private media outside the media library, download from the submission in the admin, and are deleted with it. Set `public: true` on a field only when your website shows the files. A form that takes files must store its submissions.

## Hooks

`forms.beforeSubmit` runs once a submission passed its checks, and can change its values or refuse it by throwing a `LucidError`. `forms.afterSubmit` runs once it is stored, such as to add the person to a mailing list:

```typescript
defineHook({
  service: "forms",
  event: "afterSubmit",
  handler: async ({ meta, data }) => {
    if (meta.form.key === "newsletter") await subscribe(data.values.email);
  },
});
```

`toolkit.forms.submit({ key, values })` sends a form from your own server code with the same checks.
