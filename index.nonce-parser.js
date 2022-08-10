const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'public', 'html', 'index.html');
const $ = cheerio.load(fs.readFileSync(indexPath));
$('script').each((i, elem) => $(elem).attr('nonce', 'random-csp-nonce'));

const index = $.html();
const formattedIndex= index.replace(/(^\s*)|\n/gm, '');

fs.writeFileSync(indexPath, formattedIndex, 'utf8');
