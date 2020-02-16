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
  const searchParamsIterable = parsedURL.searchParams.entries();
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
      case "strong_open":
      case "em_open":
        renderResult += "<" + token.tag + ">";
        break;

      case "heading_close":
      case "paragraph_close":
      case "bullet_list_close":
      case "ordered_list_close":
      case "list_item_close":
      case "strong_close":
      case "em_close":
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
        renderResult +=
          '<img alt="' +
          escapeHTML(token.content) +
          '" src="' +
          escapeHTML(token.attrs[0][1]) +
          '" /><br />';
        break;
    }
    renderResult += renderHTML(token.children);
  }
  return renderResult;
};

// https://stackoverflow.com/a/33206814
const renderText = (tokens, useColor, level) => {
  if (tokens === null) return "";
  if (typeof level === "undefined" || level === null) level = 0;

  let renderResult = "";
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    switch (token.type) {
      case "heading_open":
        if (useColor) renderResult += "\033[1;4m";
        break;

      case "heading_close":
        if (useColor) renderResult += "\033[0m";
        else {
          renderResult +=
            "\n" + "-".repeat(tokens[i - 1].children[0].content.length);
        }
        renderResult += "\n\n";
        break;

      case "strong_open":
        if (useColor) renderResult += "\033[1m";
        else renderResult += "**";
        break;

      case "strong_close":
        if (useColor) renderResult += "\033[0m";
        else renderResult += "**";
        break;

      case "em_open":
        if (useColor) renderResult += "\033[3m";
        else renderResult += "*";
        break;

      case "em_close":
        if (useColor) renderResult += "\033[0m";
        else renderResult += "*";
        break;

      case "paragraph_close":
        renderResult += "\n\n";
        break;

      case "bullet_list_open":
      case "ordered_list_open":
        level++;
        break;

      case "bullet_list_close":
      case "ordered_list_close":
        level--;
        break;

      case "list_item_open":
        renderResult += "  ".repeat(level - 1) + "- ";
        break;

      case "inline":
        break;
      case "text":
        renderResult += token.content;
        break;

      case "code_inline":
        renderResult += "`" + token.content + "`";
        break;
      case "fence":
        renderResult += "```\n";
        renderResult += token.content;
        renderResult += "```\n\n";
        break;

      case "image":
        renderResult += "Image: " + token.attrs[0][1] + "\n";
        renderResult += token.content;
        break;

      default:
        console.log(token);
    }

    renderResult += renderText(token.children, useColor, level + 1);
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
  tokens.splice(0, startIndex);
  if (options.outputFormat === "plain") {
    // Render plaintext
    renderResult += renderText(tokens, options.useAnsiColors);
  } else {
    // Render HTML
    renderResult += renderHTML(tokens);
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
