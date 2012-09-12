/**
 * Skrypt generujący dane o przystankach końcowych oraz trasach linii tramwajowych i autobusowych
 */
var http = require('http'),
	fs = require('fs');

// TODO: przenieść do klasy bota
function getPage(url, callback) {
	var page = '';

	http.get(url, function(resp) {
		resp.on("data", function(chunk) {
			page += chunk;
		});

		resp.on('end', function() {
			if (typeof callback === 'function') {
				callback(page);
			}
		});
	}).on('error', function(e) {
		console.log(e);
	});
}

function parseTimetable(page, line) {
	var matches = page.match(routeRegExp);

	if (matches) {
		// parsuj trasę + usuń przystanki końcowe
		var streets = matches[1].split(/-|–/).
			slice(1, -1).
			map(function(item) {
				return item.trim();
			});

		console.log('#' + line + ': ' + streets.join(', '));

		streets.forEach(function(street) {
			// ignoruj ronda
			if (street.indexOf('Rondo') > -1) {
				return;
			}

			// rozwiń skróty + małe poprawki
			street = street.
				replace("Al.", 'Aleja').
				replace(/[śŚ]w\./, 'Święty').
				replace('ŚwiętyMarcin', 'Święty Marcin').
				replace('Świety', 'Święty').
				replace('Piasnicka', 'Piaśnicka').
				replace('Os. ', 'Osiedle ');

			if (street.indexOf('28 Czerwca') === 0) {
				street = '28 Czerwca 1956 r.';
			}

			ulice[street] = ulice[street] || [];

			if (ulice[street].indexOf(line) === -1) {
				ulice[street].push(line);

				// sortuj mr linii jako wartości liczbowe
				ulice[street].sort(function(a,b) {
					return a - b;
				});
			}
		});

		// katualizuj "bazę"
		fs.writeFileSync('db/ulice-ztm.json', JSON.stringify(ulice));
	}
}

var petle = {},
 	ulice = {},
	timetableRegExp = /<a href='(timetable.html[^']+)'>/,
	timetableLastRegExp = /\<a href='(timetable.html.php[^']+)'>[^>]+<\/a><\/li><\/ul><\/div>/,
	routeRegExp = /<div id='descriptions'><p>([^<]+)/,
	petleRegExp = />([^<]+)<\/a><\/li><\/ul>/g;

var l, lines = [];

// linie tramwajowe
for (l=1; l<30; l++) {
	lines.push(l);
}
lines.push('N21');

// linie autobusowe (dzienne)
for (l=40; l<100; l++) {
	lines.push(l);
}

// linie autobusowe (nocne)
for (l=231; l<255; l++) {
	lines.push(l);
}

lines.forEach(function(line) {
	var url = {
		host: '193.218.154.93',
		path: '/dbServices/gtfs-ztm/route_directions.html.php?route_name=' + line + '&agency_name=ZTM_MPK'
	};

	getPage(url, function(page) {
		// pobierz rozkład jazdy -> trasa w obie strony
		var timetableUrl = page.match(timetableRegExp),
			timetableLastUrl = page.match(timetableLastRegExp);

		if (timetableUrl) {
			getPage({
				host: '193.218.154.93',
				path: '/dbServices/gtfs-ztm/' + timetableUrl[1]
			}, function(page) {
				parseTimetable(page, line);
			});
		}

		if (timetableLastUrl) {
			getPage({
				host: '193.218.154.93',
				path: '/dbServices/gtfs-ztm/' + timetableLastUrl[1]
			}, function(page) {
				parseTimetable(page, line);
			});
		}

		// parsuj pętle
		var matches = page.match(petleRegExp) || []

		matches.forEach(function(match) {
			var stop = match.substr(1, match.length - 15).trim();

			// ucfirst()
			stop = stop[0] + stop.substring(1).toLowerCase();

			// porządki
			stop = stop.
				trim().
				replace("Os. sobieskiego", "Osiedle Jana III Sobieskiego").
				replace(/pl\. /i, "Plac ").
				replace(/os\. /i, "Osiedle ").
				replace("os.", "Osiedle ").
				// os. batorego ii -> os. batorego II
				replace(/\si+$/g, function(match) {
					return match.toUpperCase();
				});

			// ucfirst()
			stop = stop.replace(/[\s|\/][\w\W]/g, function(match) {
				return match.toUpperCase()
			});

			// dodaj pętle do danych linii
			petle[line] = petle[line] || [];
			petle[line].push(stop);

			console.log('#' + line + ': ' + stop);
		});
		
		// katualizuj "bazę"
		fs.writeFileSync('db/petle.json', JSON.stringify(petle));
	});
});