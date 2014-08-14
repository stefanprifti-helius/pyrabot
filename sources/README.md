## Źródła

Katalog ten zawiera pliki źródłowe służące pyrabotowi do generowania plików JSON w katalogu /db.

### Wymagania

* ``curl``
* ``xls2csv`` do konwersji plików Excel do CSV
* ``phantomjs``
* ``jsonlint``
* python

```
sudo apt-get install catdoc
sudo npm install --global phantomjs jsonlint
sudo pip install -r requirements.txt
```

### Aktualizacja

```
./update.sh
```

i gotowe :)