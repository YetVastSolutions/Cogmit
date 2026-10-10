import MarkdownIt from 'markdown-it';
import { marked } from 'marked';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { micromark } from 'micromark';
import showdown from 'showdown';
import * as commonmark from 'commonmark';
import DOMPurify from 'isomorphic-dompurify';

const mdSource = `
# H1
## H2
### H3

Paragraph with **bold**, *italic*, \`inline code\`, and ~~strikethrough~~.

1. Ordered 1
2. Ordered 2
   - Nested unordered 1
   - Nested unordered 2

| Col 1 | Col 2 |
|---|---|
| Val 1 | Val 2 |

- [ ] Task 1
- [x] Task 2

> Blockquote

\`\`\`javascript
const x = 1;
\`\`\`

[Link](https://example.com)
[RefLink][1]

[1]: https://example.com

---

<details><summary>HTML</summary>Content</details>

Footnote[^1]

[^1]: Footnote text
`;

async function runTest() {
  const parsers = [
    {
      name: "markdown-it",
      parse: async (md) => {
        const mdIt = new MarkdownIt();
        return mdIt.render(md);
      },
    },
    {
      name: "marked",
      parse: async (md) => marked.parse(md),
    },
    {
      name: "remark",
      parse: async (md) => {
        const result = await unified()
          .use(remarkParse)
          .use(remarkRehype)
          .use(rehypeStringify)
          .process(md);
        return String(result);
      },
    },
    {
      name: "micromark",
      parse: async (md) => micromark(md),
    },
    {
      name: "showdown",
      parse: async (md) => {
        const converter = new showdown.Converter();
        return converter.makeHtml(md);
      },
    },
    {
      name: "commonmark",
      parse: async (md) => {
        const reader = new commonmark.Parser();
        const writer = new commonmark.HtmlRenderer();
        return writer.render(reader.parse(md));
      },
    },
  ];

  for (const parser of parsers) {
    console.log(`\n======================================`);
    console.log(`Testing parser: ${parser.name}`);
    console.log(`======================================\n`);
    
    try {
      const rawHtml = await parser.parse(mdSource);
      console.log(`\n--- A. RAW HTML ---`);
      console.log(rawHtml);
      
      const sanitizedHtml = DOMPurify.sanitize(rawHtml);
      console.log(`\n--- B. SANITIZED HTML ---`);
      console.log(sanitizedHtml);
      
      const diff = rawHtml !== sanitizedHtml;
      console.log(`\n--- SANITIZATION STRIPPED CONTENT? ${diff} ---`);
    } catch (e) {
      console.error("Error:", e);
    }
  }
}

runTest();
