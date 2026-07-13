const cheerio = require("cheerio-without-node-native");
const fetch = require("node-fetch");

const PROVIDER_NAME = "PikaHD";
const BASE_URL = "https://new.pikahd.co";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
};

async function fetchHtml(url) {
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    return cheerio.load(await res.text());
  } catch (e) {
    console.error("Fetch error:", e.message);
    return null;
  }
}

async function searchByTitle(query) {
  const url = `\( {BASE_URL}/?s= \){encodeURIComponent(query)}`;
  const $ = await fetchHtml(url);
  if (!$) return [];
  const results = [];
  $("article, .post, .entry").each((_, el) => {
    const title = $(el).find("h1, h2, h3, .entry-title").first().text().trim();
    let link = $(el).find("a").first().attr("href");
    if (title && link) {
      if (!link.startsWith("http")) link = BASE_URL + link;
      results.push({ title: title.replace(/Download|Watch/gi, "").trim(), link });
    }
  });
  return results;
}

async function extractLinks(pageUrl) {
  const $ = await fetchHtml(pageUrl);
  if (!$) return [];
  const streams = [];
  $('a[href*="drive"], a[href*=".mp4"], a[href*="cloud"], a[href*="gdrive"]').each((_, el) => {
    let href = $(el).attr("href");
    if (href) {
      if (!href.startsWith("http")) href = BASE_URL + href;
      streams.push({
        name: PROVIDER_NAME,
        title: $(el).text().trim() || "PikaHD Stream",
        url: href,
        quality: "HD"
      });
    }
  });
  return streams;
}

const manifest = {
  id: "com.pikahd.plugin",
  name: "PikaHD",
  description: "PikaHD from new.pikahd.co",
  version: "1.0.0",
  resources: ["stream"],
  types: ["movie", "series"],
  catalogs: []
};

module.exports = async function handler(req, res) {
  const url = req.url || req.path || '/';

  if (url.includes("manifest.json") || url === '/') {
    return res ? res.json(manifest) : manifest;
  }

  const { type, id } = req.query || {};
  const query = "Inception"; // Change later

  const searchResults = await searchByTitle(query);
  let allStreams = [];

  for (const result of searchResults.slice(0, 3)) {
    const links = await extractLinks(result.link);
    allStreams = allStreams.concat(links);
  }

  return res ? res.json({ streams: allStreams }) : { streams: allStreams };
};
