const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'public', 'html', 'index.html');
const $ = cheerio.load(fs.readFileSync(indexPath));
const script = $('script');
const link = $('link');

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

script.each((i, elem) => addOriginAnonymous(elem));
link.each((i, elem) => addOriginAnonymous(elem));

const index = $.html();
const formattedIndex= index.replace(/(^\s*)|\n/gm, '');

fs.writeFileSync(indexPath, formattedIndex, 'utf8');
