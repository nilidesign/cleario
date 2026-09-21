# Cleario

An ad-free, browser-only text cleaner by [NiliDesign](https://www.nilidesign.com).

Static HTML, CSS and JavaScript. No build step, package dependencies, API keys, analytics, uploads, or paid services. Only the color-theme preference is saved locally; pasted text is never persisted.

## Use

- **Clean** removes HTML, formatting, invisible control characters, and unusual whitespace. Keep paragraphs is optional. Meaningful letters, punctuation and Unicode joiners are preserved.
- **Optimize** extracts existing headings and lists, understands Markdown heading markers and common Word heading metadata, and conservatively suggests headings from plain text. Review and adjust every block under **Review heading levels**. Automatic inference cannot guarantee the intended hierarchy.
- **Copy result** copies rich HTML plus plain text in Preview, or HTML source in the HTML view. CMS paste settings may further filter formatting.

## Hosting

Publish `main` from the repository root using GitHub Pages. `index.html`, `app.js`, and `favicon.svg` are the complete website. `.nojekyll` disables Jekyll processing.

For a custom domain, configure the domain in repository Settings → Pages and add the DNS records shown by GitHub at your registrar. Do not add a CNAME file until the domain is owned and ready.

## Local preview

Run `python3 -m http.server 8000` in this directory and visit http://localhost:8000.
