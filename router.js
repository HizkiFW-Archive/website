const express = require("express");
const router = express.Router();
const parser = require("./parser");
const fs = require("fs");
const CLI_UA_REGEX = /^(curl|wget)(.*)/i;

router.get("/*", function(req, res, next) {
  const path = parser.parseUrl(req.url);
  const userAgent = req.get("User-Agent");

  console.log(path);
  console.log(userAgent);

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

  console.log({ outputFormat, useAnsiColors });

  fs.readFile(path.location, (err, data) => {
    if (err) next();

    const page = parser.parsePage(data.toString(), {
      outputFormat,
      useAnsiColors
    });

    if (outputFormat === "html")
      res.render("default", {
        title: page.meta.title,
        contents: page.contents,
        request: req
      });
    else res.send(page.contents);
  });
});

module.exports = router;
