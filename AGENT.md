# Worksheet agent playbook

This is the job the nightly worksheet agent runs on this repository. It keeps the Life of P Worksheets site in step with the Life of P YouTube channel (https://www.youtube.com/@lifeofp5750). Every video gets a topic, and every topic grows to 15 printable worksheets.

## Each run

1. **Sync new videos.** Fetch the channel feed at https://www.youtube.com/feeds/videos.xml?channel_id=UC5nxfittOf_8ColIHS4MFwg. For each video not already listed in `tools/videos.txt`, add a line in the form `VIDEO_ID | Title | subtitle`. Then run `python3 tools/build.py sync`.
   - Shorts and non-lesson uploads are skipped automatically, because sync only reads titles shaped like "<Topic> for Kids – Grade 2 Maths/English/Science".
   - If the feed can't be reached, skip this step and carry on.
2. **Read parent requests.** Parents ask for worksheets and videos with the form on the site (`#request`). Each request is a row in **Parent Requests.xlsx** in Varun's OneDrive folder `3. Kids Video`. Any photos, videos or PDFs they attached are in the `3. Kids Video/Parent Requests` folder, named `<Request ID>-NN-<file>`.
   - Use the Microsoft 365 connector. Find the file with `sharepoint_search` (query "Parent Requests", fileType xlsx) and read it with `read_resource`. The sheet is `Requests`, with columns A–M: Received, Request ID, Parent name, Email, Subject, Topic, Wants, Details, Attachments, Sent from page, Status, Video ID / topic id, Notes.
   - Take rows whose Status is `New`, oldest first. Ignore spam and anything that is not a Standard 2 learning request: set those to `Declined` with a short reason.
   - Read the details, and look at the attached images with `read_resource`, to learn exactly what the class is doing (book page, exercise style, the teacher's method). Use that when you write the sheets. Never copy textbook pages or pictures, and never put a child's name, school or face into a sheet.
   - **A topic already on the site:** that topic goes first in this run's topic count. Write sheets that match what the parent described, adding to the topic (keep the 1–15 numbering).
   - **A new topic that has no video yet:** add it to `data/topics.json` with `videoId` and `videoUrl` set to "", and fill in `about`. Write its first 5 sheets (sheets 1–4 Starter, sheet 5 Practice). The site shows "Video link coming soon", and the video is attached automatically when it appears in the channel feed.
   - **"Video only" or "Worksheets and video":** the video is made by the separate video job. Put `Video needed` in Notes, so the video job (or Varun) can pick it up. Do not try to make videos here.
   - When the sheets are pushed, update the row. Status becomes `Done` (or `In progress` if only the worksheets are done and a video is still needed). Column L gets the topic id, and Notes gets a short note (for example "5 sheets added to fractions, 5 Nov").
   - To update the row, download the workbook, change only those cells with openpyxl, and upload it back with `sharepoint_upload_file` (conflictBehavior `replace`). Read the file again just before writing, so a request that arrived in the meantime is not lost. If the update fails, say so in the report.
   - In the final report, list each request handled, with its Request ID.
3. **Pick the work.** Choose **2 topics** (requested topics count first):
   - First, topics that already have some worksheets but fewer than 15.
   - Then untouched topics, in the order they appear in `data/topics.json`. Alternate subjects so Maths, English and Science all move forward.
   - Bring each chosen topic up to 15 sheets in this run.
4. **Research the topic.**
   - Search the web for "<topic> grade 2 worksheet" and "<topic> class 2 ICSE worksheet". Include Pinterest pins and teacher sites.
   - Use them only to see which skills the topic covers at Standard 2 level and which activity styles work well (matching, sorting, word boxes, fill-ins, true/false, column sums).
   - **Never copy** questions, wording or images. Every question you write must be your own.
5. **Fill the topic's `about`** in `data/topics.json` if it is empty. Write one or two plain sentences a parent would understand, saying what the child learns.
6. **Write the worksheets** into `data/worksheets/<topic-id>.json`. Add to the file if it exists; never rewrite sheets that are already there. Follow the rules below.
7. **Check:** run `python3 tools/build.py check`.
   - Fix every problem it reports and run it again until it prints `OK`.
   - It also rebuilds `data/index.json`. Never edit that file by hand.
8. **Commit and push** to `main`, with a message like `Worksheets: Fractions 1–15, Adjectives 6–15`. The site updates itself a minute later.
9. **Report** in a few lines: topics filled, how many sheets, total progress (the `OK:` line), and anything skipped.

## Worksheet rules

- **Level and coverage.**
  - This is Standard 2 (ICSE, age 7–8), not toddler work. Cover the whole topic across the 15 sheets: every sub-skill the video teaches, plus the next step up on Challenge sheets.
  - Levels: sheets 1–4 are `Starter`, 5–10 are `Practice`, 11–15 are `Challenge`.
- **Scenarios.**
  - Every sheet has its own real-life scenario as its `title`, for example "The School Book Fair", "Grandma's Kitchen", "Sports Day" or "A Trip to the Souk".
  - Mix everyday life in the UAE and India: school, home, markets, festivals, parks, travel.
  - Scenarios never repeat within a topic.
  - Children named in sheets are invented; use varied Indian and international names.
- **Fresh examples.** Each sheet uses different words and numbers from the other sheets in the topic. Don't recycle the same examples with a new title.
- **Variety.**
  - Use 4–6 sections per sheet, mixing at least 3 different section types.
  - Vary the order and mix from sheet to sheet.
  - End most sheets with a short "think and write", word-problem or real-life section.
- **One A4 page.**
  - `tools/build.py check` estimates the height and fails anything too long.
  - Aim for 15–30 marks in total.
  - Keep instructions to one short sentence a 7-year-old can read.
- **Correct answers.**
  - Every item carries its answer, because the answer key prints from it.
  - Work out every number answer with Python before writing it down. Never do the sums in your head.
  - Read each English and Science answer back against the question.
  - Children can also do every sheet online, and the site marks it from these answers. So a `fill`, `pairs` or `column` answer should be the short thing a child would type. Separate other accepted answers with ` / ` (for example `close / shut`), and start an open answer with `e.g.` so it is shown as "check with a grown-up" instead of marked wrong.
- **Money** is in Indian Rupees (₹), matching the channel's Money video.
- **Look.** Graphics stay subtle and text-based; the site handles the styling. Never use emoji in worksheet text.

## Section types

The JSON shapes are below. Every section also has `title` (the instruction) and `marks`.

| type | fields | prints as | good for |
|---|---|---|---|
| `pairs` | `items: [{q, a}]` (4–8) | 4-across boxes `q → ____` | verb forms, opposites, plurals, number names |
| `fill` | `items: [{q, a}]` (3–6), `q` contains `___` | sentences with one blank | grammar in context, word problems |
| `choice` | `items: [{before, options[], after, a}]` (3–5) | circle the right word | a/an/the, tense, greater/less |
| `truefalse` | `items: [{q, a: true/false}]` (3–6) | circle True / False | science facts, rule checks |
| `match` | `items: [{left, right}]` (4–6) | join the dots | animal → home, sum → answer, word → meaning |
| `sort` | `groups[]`, `words[]`, `a: {word: group}` | word box, then a column per group | living/non-living, noun types, odd/even |
| `column` | `items: [{top, op, bottom, a}]` (4–8), `op` is `+`, `-` or `×` | vertical sums | addition, subtraction, multiplication |
| `rewrite` | `items: [{q, a}]` (1–3) | sentence plus a writing line | change the tense, make a sentence |
| `lines` | `lines` (1–3), `a` (a marking note) | free writing lines | "write about…" |

Worksheet object:

```json
{ "id": "<topic-id>-NN", "topic": "<topic-id>", "number": 1, "level": "Starter",
  "title": "The School Book Fair", "intro": "One line that sets the scene.", "sections": [ … ] }
```

For good examples to match, see `data/worksheets/present-tense-and-past-tense.json` (sheet 3) and `data/worksheets/subtraction-with-borrowing.json` (sheet 1).
