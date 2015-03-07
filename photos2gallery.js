#!/usr/bin/env node
/**
 * Skrypt migrujący zdjęcia na galerię
 */

var bot = require('nodemw'),
	client = new bot('config.js');

var REASON = 'Porządkuję zdjęcia',
	PAGE = process.argv[2];

if (!PAGE) {
	console.log('Podaj tytuł artykułu');
	process.exit(1);
}

client.log('Artykuł: ' + PAGE);

client.logIn(function() {
	client.getArticle(PAGE, function(err, content) {
		if (err) return;

		// zdjęcia
		// [[File:Schemat cytadela.jpg|thumb|220x220px|Plan Fortu Winiary]]
		var re = /\[\[(File|Plik)[^\]]+\]\]/g,
			matches = content.match(re) || false;

		if (matches === false) {
			return;
		}

		//console.log(matches); return;
		
		// formatuj galerię
		var gallery = '== Galeria ==\n';
		gallery += '<gallery captionalign="left" orientation="none" widths="200" columns="3" bordercolor="#ffffff" bordersize="large" spacing="small">\n';

		matches.forEach(function(item) {
			var parts = item.substr(7).split('|'); // usuń [[File:

			content = content.replace(item, '');

			// nazwa pliku
			gallery += parts[0];

			// opis
			if (parts.length > 1) {
				gallery += '|' + parts.pop().replace(/\]\]$/, '');
			}

			gallery += "\n";
		});

		gallery += '</gallery>';

		content = content.trim() + "\n\n" + gallery;
		//console.log(content); return;

		// zapisz zmiany
		client.edit(PAGE, content, REASON, function() {
			console.log('# Poprawiłem '+ PAGE);
		});
	});
});
