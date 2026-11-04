# Life of P Worksheets

Printable Standard 2 (ICSE) worksheets for every video on the Life of P YouTube channel.
The site is plain HTML/CSS/JS served by GitHub Pages. It has no build step and no server.

## How it fits together

- `index.html`: the site. It reads the data files and draws the pages.
- `data/topics.json`: one entry per video topic. It holds the subject, name, about text, YouTube link and target sheet count (15).
- `data/worksheets.json`: every worksheet. **Adding a worksheet means appending an object here.**
- `assets/`: styles and script.

Printing uses the browser's print dialog. Each worksheet is one A4 page. The answer key prints as an extra page when it is switched on. The site has no download button.

## Worksheet format (for the worksheet agent)

```json
{
  "id": "EN-PT-03",            // SUBJECT-TOPIC-NN, unique
  "topic": "past-tense",       // id from topics.json
  "number": 3,                 // 1–15 within the topic
  "level": "Starter",          // Starter (1–4) | Practice (5–9) | Challenge (10–15)
  "title": "Beach Day at JBR", // the real-life scenario
  "intro": "One line that sets the scene.",
  "sections": [ ... ]          // 4–6 sections, about 20–26 marks, must fit one A4 page
}
```

Section types:

| type | fields | prints as |
|---|---|---|
| `pairs` | `items: [{q, a}]` (8 max) | 4-across boxes: `q → ____` |
| `fill` | `items: [{q, a}]`, `q` contains `___` | numbered sentences with a blank |
| `choice` | `items: [{before, options[], after, a}]` | circle the correct word |
| `rewrite` | `items: [{q, a}]` | sentence plus a writing line |
| `lines` | `lines`, `a` | free writing lines |

Every section also has `title` (the instruction) and `marks`.

## Content rules

- Grade 2 level: full coverage of the topic, not toddler-style.
- Each sheet in a topic uses a different real-life scenario and different examples.
- Graphics stay subtle. The sheet must print well in black and white.
- Children named in scenarios are made up.
