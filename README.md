# Life of P Worksheets

Printable Standard 2 (ICSE) worksheets for every video on the [Life of P YouTube channel](https://www.youtube.com/@lifeofp5750).
The site is plain HTML, CSS and JavaScript, served by GitHub Pages. It has no build server.

- `index.html` and `assets/`: the site.
- `data/topics.json`: one topic per channel video, with its YouTube link.
- `data/worksheets/<topic-id>.json`: the worksheets for that topic.
- `data/index.json`: the list of all worksheets, rebuilt by `python3 tools/build.py check`.
- `tools/build.py`: adds topics for new videos (`sync`) and validates every worksheet (`check`).
- `AGENT.md`: the playbook the nightly worksheet agent follows, including the worksheet format.

Printing uses the browser's print dialog. Each worksheet is one A4 page, and the answer key prints as an extra page when it is switched on. The site has no download button.
