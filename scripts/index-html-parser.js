const cheerio = require('cheerio');
const {readFileSync, writeFileSync} = require("fs");
const {join} = require("path");

const basePath = join(__dirname, '../');

const indexPath = join(basePath, 'public/html/index.html');
const $ = cheerio.load(readFileSync(indexPath));
const script = $('script');
const style = $('style');
const link = $('link');
const head = $('head');

// remove script and media from main styles
const mainStyles = $('link[rel="stylesheet"]');
mainStyles.removeAttr('media');
mainStyles.removeAttr('onload');

// window.__webpack_nonce__
const webpack_nonce = $('<script>');
webpack_nonce.attr('nonce', 'random-nonce');
webpack_nonce.text(`window.__webpack_nonce__ = 'random-nonce';`);
head.append(webpack_nonce);

// ngCspNonce
const appRoot = $('body app-root');
appRoot.attr('ngCspNonce', 'random-nonce');

// nonce
script.each((i, elem) => $(elem).attr('nonce', 'random-nonce'));
style.each((i, elem) => $(elem).attr('nonce', 'random-nonce'));
link.each((i, elem) => $(elem).attr('nonce', 'random-nonce'));

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
