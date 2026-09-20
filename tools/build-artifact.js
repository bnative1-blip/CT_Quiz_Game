/*
 * Inlines styles.css, topics.js and app.js into a single body-only HTML
 * fragment suitable for publishing as a Claude Artifact (the artifact host
 * supplies the doctype/head/body wrapper itself).
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

const html = read('index.html');
const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));

const fontLink = html.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis[^>]*>/)[0];

const out = [
  '<title>Cooling Tower Chemistry Challenge</title>',
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  fontLink,
  '<style>\n' + read('css/styles.css') + '\n</style>',
  body.trim()
    .replace(/<script src="js\/topics\.js"><\/script>/, '<script>\n' + read('js/topics.js') + '\n</script>')
    .replace(/<script src="js\/scene\.js"><\/script>/,  '<script>\n' + read('js/scene.js') + '\n</script>')
    .replace(/<script src="js\/app\.js"><\/script>/,   '<script>\n' + read('js/app.js') + '\n</script>')
].join('\n');

fs.writeFileSync(path.join(root, 'dist/cooling-tower-quiz.html'), out);
console.log('dist/cooling-tower-quiz.html  ' + (out.length / 1024).toFixed(1) + ' KB');
