const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const {readdirSync, rmSync, readFileSync} = require("fs");
const {join} = require("path");

const basePath = path.join(__dirname, '../');

const files = readdirSync(path.join(basePath, 'public/html'));
const indexPath = path.join(basePath, 'public/html/index.html');
const $ = cheerio.load(fs.readFileSync(indexPath));
const script = $('script');
const link = $('link');
const filesToLoad = new Set(['runtime', 'polyfills', 'styles']);
const scriptMap = {};

for (const fileName of files) {

  if (filesToLoad.has(fileName.split('.')[0])) {

    const filePath = join(basePath, 'public/html', fileName);

    scriptMap[fileName] = {
      text: readFileSync(filePath),
      fileName
    };
  }
}

// nonce
script.each((i, elem) => $(elem).attr('nonce', 'random-csp-nonce'));

// crossorigin
const crossOriginNonAnonymousUrls = new Set([
  'https://consent.cookiebot.com/uc.js'
]);
const addOriginAnonymous = (elem) => {

  const href = $(elem).attr('href');
  const src = $(elem).attr('src');

  if (crossOriginNonAnonymousUrls.has(href) || crossOriginNonAnonymousUrls.has(src)) {
    $(elem).removeAttr('crossorigin');
    return;
  }

  $(elem).attr('crossorigin', 'anonymous');
}
script.each((_, elem) => {
  if ($(elem).attr('src')) {
    addOriginAnonymous(elem);
  }
});
link.each((_, elem) => addOriginAnonymous(elem));

script.each((_, elem) => {
  const src = $(elem).attr('src');

  if (src && scriptMap[src]) {
    $(elem).attr('src', null);
    $(elem).attr('crossorigin', null);
    $(elem).text(scriptMap[src].text);
    rmSync(join(basePath, 'public/html', scriptMap[src].fileName));
  }
});

link.each((i, elem) => {
  const href = $(elem).attr('href');
  const stylesheet = $(elem).attr('rel') === 'stylesheet';

  if (href && scriptMap[href] && stylesheet) {
    const style = $('<style></style>');
    style.text(scriptMap[href].text);
    $(elem).replaceWith(style);
    rmSync(join(basePath, 'public/html', scriptMap[href].fileName));
  }
});

const index = $.html();
const formattedIndex = index.replace(/(^\s*)|\n/gm, '');

fs.writeFileSync(indexPath, formattedIndex, 'utf8');
