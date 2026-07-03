<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:mobile-design-rules -->
## Mobile design (iPhone-first)

Swim Carpool is used mostly on iPhone. Default to layouts that fit **one screen without scrolling** on a standard phone (≈390×844 with safe areas).

- **Bottom sheets** (`DaySheet`, etc.): tight header (`py-2`, `text-base`), body `px-3 py-2 space-y-2`, prefer `max-h-[92dvh]` only as a fallback — design content to fit first.
- **Spacing**: use `p-2` / `gap-2` / `space-y-1.5` in dense sections (notes, pickup rows, location chips). Reserve `space-y-4` and large padding for sparse pages only.
- **Typography**: section titles `text-xs font-semibold`; labels `text-xs`; inputs `text-sm py-1.5` in compact forms. Primary page titles may be `text-base`–`text-lg`.
- **Touch targets**: primary actions (Save, claim driver) use `touch-target` (44px). Secondary row controls use `touch-target-compact` (40px) when space is tight.
- **Notes / pickup lists**: single-line rows, truncate long names, skip redundant helper copy. Put extra detail in `title` tooltips instead of a second line.
- **Avoid** stacking optional helper paragraphs under every section — one short line or an inline link is enough.
<!-- END:mobile-design-rules -->
