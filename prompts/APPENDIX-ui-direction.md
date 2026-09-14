# Appendix: UI Direction (re-use for every UI-touching phase)

Paste this alongside any phase prompt that generates or touches UI (phases
1, 5, 6, 8). It stops the AI coding tool from defaulting to generic
"AI-generated" styling patterns.

---

**Design instruction to include verbatim:**

> Act as a design lead giving this product a distinct visual identity, not
> a templated one. Before writing any UI code, propose a short design plan:
> a 4–6 color token palette (named hex values), the typefaces and their
> roles, and a one-paragraph layout concept — then check that plan against
> this list of generic "AI-generated" tells and revise anything that
> matches before building:
>
> 1. Warm cream background (~#F4F1EA) with a terracotta/clay accent
>    (~#D97757).
> 2. Near-black background with a single bright acid-green or vermilion
>    accent.
> 3. Identical rounded cards everywhere with the same soft grey shadow and
>    gradient washes as decoration.
> 4. Tracked-out ALL-CAPS eyebrow labels above every heading.
> 5. Meta text joined with middle dots ("A · B · C"), or labels like
>    "WORD — fragment" with a spaced em dash.
> 6. Monospace font used for small data labels for no functional reason.
> 7. A "→" appended to every link/button label.
> 8. Numbered markers (01 / 02 / 03) on content that isn't actually a
>    sequence.
> 9. Fade-and-slide-up entrance animation on every section, hover
>    transition on every card.
>
> This is a **finance product** — ground the palette and type choices in
> that: legible numerals, calm and trustworthy (not playful fintech-neon,
> not sterile enterprise-grey), one deliberate accent color used sparingly
> for the thing that matters most (e.g. flagging an anomaly or an
> unverified extraction), not decoratively. Body text under 80 characters
> per line. One memorable design decision, everything else quiet and
> disciplined around it.
>
> Build to a quality floor: responsive to mobile width, visible keyboard
> focus states, reduced-motion respected, real color contrast — without
> announcing any of this in the UI copy.
>
> Empty states and errors are written in the product's voice: say exactly
> what happened and what to do next. No "Oops!", no vague apology text.

---

Use this every time — do not assume the AI tool "remembers" it from an
earlier phase in a fresh session.
