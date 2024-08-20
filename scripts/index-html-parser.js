const cheerio = require('cheerio');
const {readdirSync, rmSync, readFileSync, writeFileSync, cpSync} = require("fs");
const {join} = require("path");

const basePath = join(__dirname, '../');

const files = readdirSync(join(basePath, 'public/html'));
const indexPath = join(basePath, 'public/html/index.html');
const $ = cheerio.load(readFileSync(indexPath));
const script = $('script');
const link = $('link');

// nonce
script.each((i, elem) => $(elem).attr('nonce', 'random-csp-nonce'));

// crossorigin
const crossOriginNonAnonymousUrls = new Set([]);
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

const index = $.html();
const formattedIndex = index.replace(/(^\s*)|\n/gm, '');

writeFileSync(indexPath, formattedIndex, 'utf8');
