# Lagrangian Capability Brief (generic offer package)

A two-page, client-facing capability brief. It presents the range of work we do as an
idea board of eight domains, with **no prices** — scope is established at intake and the
scoping call, and price follows from that.

## Files

| File | Purpose |
| --- | --- |
| `lagrangian-capability-brief.html` | The brief. Self-contained: brand fonts and the logo are embedded, so it renders identically offline and on any machine. |
| `Lagrangian-Capability-Brief.pdf` | Print/email deliverable, Letter, exactly two pages. |

## Editing

All prose sits in the markup at the end of the HTML file, after the `<style>` block.
The leading base64 blobs are the embedded Playfair Display / Libre Franklin faces and
the logo — leave them alone and edit the copy below.

Brand values are the same tokens the marketing site uses (`lagrangian-site/src/App.jsx`):
navy `#10213E`, gold `#D6A83A`, Playfair Display for display type, Libre Franklin for body.

## Regenerating the PDF

Both sheets are sized to exactly 11in; page 1 has no slack, so re-check the page count
after any copy change that adds lines.

```bash
npx playwright@1.56.1 pdf --paper=letter lagrangian-capability-brief.html Lagrangian-Capability-Brief.pdf
```

Or in Chrome: Print → Destination "Save as PDF" → Paper "Letter" → Margins "None" →
enable "Background graphics".
