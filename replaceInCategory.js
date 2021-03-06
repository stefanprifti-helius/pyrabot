#!/usr/bin/env node
/**
 * Skrypt dokonujący zamiany tekstu w artykułach podanej kategorii
 */
var bot = require('nodemw'),
	client = new bot('config.js');

// konfiguracja
/**
var CATEGORY = 'Linie tramwajowe',
    	REGEXP = /(foto=\[\[Plik:[^\|]+)\|thumb/,
	REPLACEMENT = '$1',
	SUMMARY = 'Korekta stylu zdjęć w infoboxach';
/**
var CATEGORY = 'Linie tramwajowe',
    	REGEXP = /29\dpx\]\]/,
	REPLACEMENT = '300px]]',
	SUMMARY = 'Korekta rozmiaru zdjęć w infoboxach';

var wiek = 'XIV';

var CATEGORY = 'Wiek ' + wiek,
    	REGEXP = '[[Kategoria:Wiek ' + wiek +']]',
	REPLACEMENT = '[[Kategoria:' + wiek + ' wiek]]',
	SUMMARY = 'Unifikacja nazewnictwa kategorii ze stuleciami (' + wiek + ' wiek)';
**/
/**
var CATEGORY = 'Poznańskie Autobusy',
	REGEXP = '[[Kategoria:Poznańskie Autobusy]]',
	REPLACEMENT = '[[Kategoria:Transport publiczny]]\n[[Kategoria:Autobus]]\n[[Kategoria:Tabor]]',
	SUMMARY = 'Unifikacja nazewnictwa kategorii';
**
var CATEGORY = 'Ceglorz',
	REGEXP = '[[Kategoria:Ceglorz]]',
	REPLACEMENT = '[[Kategoria:Zakłady Hipolita Cegielskiego]]',
	SUMMARY = 'Unifikacja nazewnictwa kategorii';
/**/
/**
var CATEGORY = 'MPK Poznań',
	REGEXP = '[[Kategoria:MPK Poznań]]',
	REPLACEMENT = '',
	SUMMARY = 'Usunięcie kategorii MPK Poznań';
/**
var CATEGORY = 'Komunikacja miejska',
	REGEXP = '[[Kategoria:Komunikacja miejska]]',
	REPLACEMENT = '',
	SUMMARY = 'Unifikacja nazewnictwa kategorii';
/**
var CATEGORY = 'Osoby',
	REGEXP = / \(ur\.[^\)]+zm\.[^\)]+\) /,
	REPLACEMENT = ' ',
	SUMMARY = 'Przeniesienie danych biograficznych do infoboxa';
**
var CATEGORY = 'Inicjatywy obywatelskie',
	REGEXP = /<(span|p)[^>]+>|<\/span>|<\/p>/g,
	REPLACEMENT = '',
	SUMMARY = 'Oczyszczanie wikitekstu';
/**
var CATEGORY = 'Kalendarium',
	REGEXP = /(''')?W roku [^\n]+ w Poznaniu:(''')?/g,
	REPLACEMENT = '{{Kalendarium}}',
	REMOVE = '[[Kategoria:Kalendarium]]',
	SUMMARY = 'Dodaję nagłówek stron kalendarium';
/**
var CATEGORY = 'Lucjan Ballenstaedt',
	REGEXP = '[[Kategoria:Lucjan Ballenstaedt]]',
	REPLACEMENT = '[[Kategoria:Lucjan Ballenstedt]]',
	SUMMARY = 'Prawidłowe brzmienie nazwiska Lucjan Ballenstaedt';
/**
var CATEGORY = 'Wiadukty',
	REGEXP = /Ballenstaedt/g,
	REPLACEMENT = 'Ballenstedt',
	SUMMARY = 'Prawidłowe brzmienie nazwiska Lucjan Ballenstedt';
/**
// [http://pl.wikipedia.org/wiki/Genesis_(grupa_muzyczna) Genesis] -> [[wikipedia:pl:Genesis_(grupa_muzyczna)|Genesis]]
var CATEGORY = 'Kalendarium',
	REGEXP = /\[http:\/\/pl.wikipedia.org\/wiki\/([^\s]+) ([^\]]+)\]/g,
	REPLACEMENT = '[[wikipedia:pl:$1|$2]]',
	SUMMARY = 'Interwiki do Wikipedii';
/**
var CATEGORY = 'Pomnik Higiei',
    	REGEXP = '[[Kategoria:' + CATEGORY + ']]',
	REPLACEMENT = '[[Kategoria:Fontanna Higiei]]',
	SUMMARY = 'Unifikacja nazewnictwa kategorii';
/**
var CATEGORY = 'Parki i skwery',
	FILTER = function(title) {
		return title.indexOf('Skwer') === 0;
	},
    	REGEXP = /$/, // dodaj na końcu wikitekstu
	REPLACEMENT = '[[Kategoria:Skwery]]',
	SUMMARY = 'Dodaję kategorię Skwery';
/**/
var CATEGORY = 'Osiedla',
        //REGEXP = '\n\n{{Nawigacja Osiedla}}',
	REGEXP = /$/, // dodaj na końcu wikitekstu
        REPLACEMENT = '\n\n{{Nawigacja Osiedla}}',
        SUMMARY = 'Nawigacja po poznańskich osiedlach';

var FILTER = function(title) {
	return title.indexOf('Osiedle') === 0;
};
/**
var CATEGORY = 'Dzień po dniu',
    	REGEXP = /'''W dniu [^']+'''/,
	REPLACEMENT = function(page, content) { //console.log(arguments);
		var months = {
				'stycznia': 1,
				'lutego': 2,
				'marca': 3,
				'kwietnia': 4,
				'maja': 5,
				'czerwca': 6,
				'lipca': 7,
				'sierpnia': 8,
				'września': 9,
				'października': 10,
				'listopada': 11,
				'grudnia': 12
			},
			header = '{{Dzień po dniu|$1}}';

		// wytnij nagłówek i kategorie
		content = content.
			replace(REGEXP, '').
			replace(/\[\[Kategoria:Dzień po d[^\]]+\]\]/, '').
			trim();

		var month, day,
			titleParts = page.title.split(' ');

		// parsuj datę
		day = parseInt(titleParts[0], 10);
		month = months[ titleParts[1] ];

		if (typeof month === 'undefined') {
			process.exit(1);
		}

		// dodaj nagłówek z datą
		content = header.replace('$1', (month < 10 ? '0' + month : month) + '-' + (day < 10 ? '0' + day : day)) +
			"\n\n" + content;

		return content;
	},
	SUMMARY = 'Dodaję nawigację po kalendarium';
**/
// konfiguracja - koniec

client.logIn(function() {
	var cnt = 0;

	client.getPagesInCategory(CATEGORY, function(err, pages) {
		client.log(pages.length + ' artykułów do sprawdzenia');

		pages.filter((page) => page.ns === 0 || page.ns === 6 /* NS_FILE */).forEach(function(page) {

			if (typeof FILTER === 'function') {
				if (FILTER(page.title) !== true) {
					console.log('> Pomijam ' + page.title);
					return;
				}
			}

			cnt++;
			console.log(cnt + ') sprawdzam ' + page.title + '...');

			client.getArticle(page.title, function(err, content) {
				var orig = content;

				if (typeof REGEXP === 'string') {
					// docelowy tekst znajduje się już w artykule
					if (typeof REPLACEMENT === 'string' &&  REPLACEMENT !== '' && content.indexOf(REPLACEMENT) > -1) {
						console.log(page.title + ' - pomijam');
						return;
					}
				}
				else {
					// regexp nie "matchuje" artykułu lub docelowy tekst znajduje się już w artykule
					if (!REGEXP.test(content) || (typeof REPLACEMENT === 'string' && content.indexOf(REPLACEMENT) > -1)) {
						console.log(page.title + ' - pomijam');
						return;
					}
				}

				// dokonaj zmiany
				if (typeof REPLACEMENT === 'function') {
					content = REPLACEMENT(page, content);
				}
				else {
					content = content.replace(REGEXP, REPLACEMENT);
				}

				// usuń string
				if (typeof REMOVE !== 'undefined') {
					content = content.replace(REMOVE, '').trim();
				}

				if (orig === content) {
					console.log(page.title + ' - brak różnicy po dokonanej zmianie tekstu - pomijam');
					return;
				}

				console.log(page.title + ':');
				console.log(client.diff(orig, content));

				// zapisz zmianę
				client.edit(page.title, content, SUMMARY, function(err) {
					if (err) {
						console.error(err);
						return;
					}

					console.log(page.title + ' zmieniony!');
				});
			});
		});

		client.log('Gotowe');
	});
});
