const fs = require("fs");
const path = require("path");
const markdown = require("markdown-it")("commonmark");

const APP_ROOT_DIR = path.join(path.dirname(require.main.filename), "..");
const PAGES_PATH_ABSOLUTE = path.join(APP_ROOT_DIR, "pages");

const parseUrl = url => {
  console.log("PATH");
  console.log(url);

  const parsedURL = new URL("http://hostname.tld/" + url);
  const filename = parsedURL.pathname;

  // Parse request options to an object
  let requestOptions = {};
  const searchParamsIterable = parsedURL.searchParams.values();
  for (const [key, value] of searchParamsIterable) {
    requestOptions[key] = value;
  }

  // Join filename with pages root
  const joined = path.join(PAGES_PATH_ABSOLUTE, filename);
  let sanitizedPath = joined + ".md";

  if (!fs.existsSync(sanitizedPath)) {
    sanitizedPath = path.join(joined, "index.md");
    if (!fs.existsSync(sanitizedPath)) {
      return {
        ok: false,
        code: 404
      };
    }
  }

  // Make sure file path is inside the pages directory
  if (joined.indexOf(PAGES_PATH_ABSOLUTE) !== 0) {
    return {
      ok: false,
      code: 400
    };
  }

  return {
    ok: true,
    location: sanitizedPath,
    options: requestOptions
  };
};

const escapeHTML = unsafe => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const renderHTML = tokens => {
  if (tokens === null) return "";

  let renderResult = "";
  for (token of tokens) {
    switch (token.type) {
      case "heading_open":
      case "paragraph_open":
      case "bullet_list_open":
      case "ordered_list_open":
      case "list_item_open":
        renderResult += "<" + token.tag + ">";
        break;

      case "heading_close":
      case "paragraph_close":
      case "bullet_list_close":
      case "ordered_list_close":
      case "list_item_close":
        renderResult += "</" + token.tag + ">";
        break;

      case "inline":
        break;
      case "text":
        renderResult += token.content;
        break;

      case "code_inline":
        renderResult += "<code>" + escapeHTML(token.content) + "</code>";
        break;
      case "fence":
        renderResult += "<pre>" + escapeHTML(token.content) + "</pre>";
        break;

      case "image":
        console.log(token);
        renderResult += '<img alt="' + escapeHTML(token.content) + '" />';
        break;
    }
    renderResult += renderHTML(token.children);
  }
  return renderResult;
};

const parsePage = (text, options) => {
  const tokens = markdown.parse(text, {});
  let pageMetadata = {
    title: "HizkiFW"
  };
  let startIndex = 0;
  let renderResult = "";

  // Begin metadata block
  if (tokens[0].type === "hr" && tokens[1].type === "heading_open") {
    startIndex = 4;
    const metaTokens = tokens[2].children;
    for (metaToken of metaTokens) {
      if (metaToken.type !== "text") continue;
      const property = metaToken.content.split(":")[0];
      const value = metaToken.content.substring(property.length + 1);
      pageMetadata[property.trim()] = value.trim();
    }
  }

  // Render tokens
  if (options.outputFormat === "plain") {
    // Render plaintext
    for (let i = startIndex; i < tokens.length; i++) {
      const token = tokens[i];
    }
  } else {
    // Render HTML
    for (let i = startIndex; i < tokens.length; i++) {
      const token = tokens[i];
      renderResult += renderHTML([token]);
    }
  }

  return {
    meta: pageMetadata,
    contents: renderResult
  };
};

module.exports = {
  parseUrl,
  parsePage
};
