import { writeFileSync } from "node:fs";
import { GUIDES } from "../src/pages/docs/data/guides.js";

const SITE = "https://dashhr.app";
const paths = ["/", "/docs", ...GUIDES.map((g) => `/docs/${g.slug}`), "/signup", "/terms", "/privacy"];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${SITE}${p}</loc></url>`).join("\n")}
</urlset>
`;

writeFileSync(new URL("../public/sitemap.xml", import.meta.url), xml);
console.log(`sitemap.xml: ${paths.length} pages`);
