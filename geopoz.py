#!/usr/bin/env python
# -*- coding: utf-8 -*-

"""
Skrypt importujący dane z bazy Geopozu dot. ulic, mostów, wiaduktów, osiedle, parków i skwerów

Dane o ulicach uzupełniane są przez kody pocztowe oraz informację o długości ulicy (źródło: ZDM)
"""

import csv
import json
import logging
import re

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger()


class CsvReader:
    """ Klasa bazowa do czytania plików CSV """
    csv = None
    items = {}

    def __init__(self, file_name, delimiter='\t'):
        csvfile = open(file_name, 'r')
        self.csv = csv.reader(csvfile, delimiter=delimiter)

        logger.info("Reading %s file..." % file_name)

    def get_csv_line(self):
        """ Pobieraj kolejne linie z pliku CSV """
        for line in self.csv:
            yield line

    def set_items(self, items):
        self.items = items

    def push_item(self, key, value):
        self.items[key] = value

    def get_items(self):
        return self.items.keys()

    def get_item(self, key):
        # spróbuj zmienić kolejność słów w pobieranym kluczu
        # Święty Marcin -> Świętego Marcina
        # św. Leonarda -> Świętego Leonarda
        if ('św.' in key or 'Święty' in key) and key not in self.items:
            key = key.replace('św.', 'Świętego').replace('Święty Marcin', 'Świętego Marcina')

        # Aleje Karola Marcinkowskiego -> Karola Marcinkowskiego
        if ('Aleje' in key) and key not in self.items:
            key = key.replace('Aleje ', '')

        # Puszkina Aleksandra -> Aleksandra Puszkina
        if ' ' in key and key not in self.items:
            words = key.split(' ')
            words.reverse()
            key = ' '.join(words)

            #logger.debug("Key fallback for %s..." % key)

        return self.items[key] if key in self.items else None


class DlugoscUlic(CsvReader):
    """ Dane o długości ulic """
    column = 0

    def __init__(self, file_name, column):
        CsvReader.__init__(self, file_name, delimiter=',')
        self.column = column

    def read(self):
        streets = {}

        for line in self.get_csv_line():
            if not re.match('^\d+$', line[0]):
                continue

            street = line[1]
            length = int(line[self.column])

            # "4","*** bez nazwy ***","PG","N","145","845","6989"
            if 'bez nazwy' in street:
                continue

            # Niepodległości aleja -> Niepodległości
            # Marcinkowskiego Karola Aleje -> Marcinkowskiego Karola
            street = street.replace(' aleja', '').replace(' Aleje', '')

            # sumuj dlugosc
            if street not in streets:
                streets[street] = 0

            streets[street] += length

        self.set_items(streets)


class KodyPocztowe(CsvReader):
    """ Dane o kodach pocztowych """
    def read(self):
        streets = {}

        for line in self.get_csv_line():
            street = line[1].replace('ul. ', '')

            if street not in streets:
                streets[street] = []

            streets[street].append(line[0])

        self.set_items(streets)


class Ulice(CsvReader):
    """ Dane o ulicach """
    def read(self):
        for line in self.get_csv_line():
            if line[0] not in ['ul.', 'al.']:
                continue

            self.push_item(line[1].strip(), value=True)


class Numeracja(CsvReader):
    """ Dane o numeracji ulic """
    def read(self):
        streets = {}

        for line in self.get_csv_line():
            # line = ['ul.', 'Jesienna', '11']
            # indeksuj tylko ulice i aleje
            if line[0] != 'ul.' and line[0] != 'al.':
                continue

            if line[1] not in streets:
                streets[line[1]] = set()

            # numeracja
            matches = re.findall('(\d+)', line[2])
            if matches is None:
                continue

            # 82/239 -> nr domu / nr lokalu -> tylko pierwsza wartość
            if '/' in line[2]:
                matches = matches[0:1]
            # 183-185 -> zakres
            elif '-' in line[2]:
                matches = range(int(matches[0]), int(matches[-1]) + 1)
            # 10b
            # 84paw5
            else:
                matches = matches[0:1]

            for match in matches:
                streets[line[1]].add(int(match))

        # sortuj numery + usuń duplikaty
        for k, v in streets.iteritems():
            numbers = list(v)
            numbers.sort()

            self.push_item(k, ', '.join(self.get_ranges(numbers)))

    @staticmethod
    def get_ranges(numbers):
        """ Generuje zakresy numerów """
        ranges = []
        curr = []

        for num in numbers + [100000]:
            # początek nowego zakresu
            if len(curr) is 0:
                curr = [num, num]
            # koniec zakresu?
            elif num - curr[1] > 1:
                if curr[0] is curr[1]:
                    curr_range = "%d" % curr[0]
                else:
                    curr_range = "%d-%d" % (curr[0], curr[1])

                ranges.append(curr_range)
                curr = [num, num]
            # kontynuuj zakres
            else:
                curr[1] = num

        return ranges


if __name__ == "__main__":
    # dane do JSONa
    res = {}
    missing_data = 0

    # baza ulic z Geopozu
    ulice = Ulice("sources/geopoz.csv", "\t")
    ulice.read()

    # numeracja ulic
    numeracja = Numeracja("sources/ulice-numeracja.csv", "\t")
    numeracja.read()

    # kody pocztowe
    kody = KodyPocztowe("sources/kody-pocztowe.csv", "\t")
    kody.read()

    # dlugości ulic
    dlugosci_podstawowe = DlugoscUlic("sources/ulice-ztm-podstawowy.csv", column=5)
    dlugosci_podstawowe.read()

    dlugosci_uzupelniajace = DlugoscUlic("sources/ulice-ztm-uzupelniajacy.csv", column=4)
    dlugosci_uzupelniajace.read()

    dlugosci_wewnetrzne = DlugoscUlic("sources/ulice-ztm-wewnetrzne.csv", column=5)
    dlugosci_wewnetrzne.read()

    # lista ulic
    items = ulice.get_items()
    items.sort()

    # generuj dane do kolejnych ulic
    for street in items:
        numbers = numeracja.get_item(street)
        zip_codes = kody.get_item(street)
        length = dlugosci_podstawowe.get_item(street)\
            or dlugosci_uzupelniajace.get_item(street)\
            or dlugosci_wewnetrzne.get_item(street)

        if length is None:
            logger.warning("Brak informacji o długości dla %s" % street)
            missing_data += 1

        if zip_codes is None:
            logger.warning("Brak informacji o kodzie pocztowym dla %s" % street)
            missing_data += 1

        res[street] = {
            'numeracja': numbers,
            'kody_pocztowe': ','.join(zip_codes) if zip_codes is not None else None,
            'dlugosc': length
        }

    # zapisz do pliku
    f = open("db/ulice.json", 'w')
    json.dump(res, f, indent=True, sort_keys=True)
    f.close()

    logger.info("Zapisano dane o %d ulicach" % len(items))
    logger.info("Brakujące informacje dla %d ulic" % missing_data)
