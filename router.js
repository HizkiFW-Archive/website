const express = require("express");
const router = express.Router();
const parser = require("./parser");
const fs = require("fs");
const CLI_UA_REGEX = /(curl|wget)\/.*/i;

router.get("/*", function(req, res, next) {
  const path = parser.parseUrl(req.path);
  const userAgent = req.get("User-Agent");

  if (!path.ok) {
    return next();
  }

  let outputFormat = "html";
  let useAnsiColors = true;
  if (CLI_UA_REGEX.test(userAgent) || path.options.plain) {
    outputFormat = "plain";
    if (path.options.plain) useAnsiColors = false;
  }
  if (path.options.colors) useAnsiColors = true;

  fs.readFile(path.location, (err, data) => {
    if (err) next();

    const page = parser.parsePage(data.toString(), {
      outputFormat,
      useAnsiColors
    });
    res.render("default", { title: page.meta.title, contents: page.contents });
  });
});

module.exports = router;
