<?php
/**
 * Transform – macht aus den Rohdaten saubere Zeilen für die Datenbank.
 *
 * Schritte:
 *   1. Nur unsere 54 afrikanischen Länder und den Weltwert (WLD) behalten.
 *   2. «date» ist bei der Weltbank Text ("2023"), wir machen eine Zahl daraus.
 *   3. Stromzugang und Bevölkerung über Ländercode + Jahr zusammenführen.
 *   4. Fehlende Werte bleiben null, niemals 0. Eine 0 hiesse «niemand hat
 *      Strom», null heisst «wissen wir nicht».
 *
 * Rückgabe mit return, load.php holt sie mit include. Eine Zeile sieht so aus:
 *   ['country_code' => 'NGA', 'country_name' => 'Nigeria', 'year' => 2023,
 *    'access_pct' => 61.2, 'population' => 227882945]
 *
 * Zusätzlich gibt die Datei eine kleine Kontrolle aus. Direkt im Browser
 * aufgerufen zeigt sie ausserdem die ersten drei Zeilen mit print_r.
 *
 * Gerechnet wird hier nichts. Die Zahl der Menschen ohne Strom entsteht
 * erst im Unload.
 */

header('Content-Type: text/plain; charset=utf-8');

$raw = include __DIR__ . '/extract.php';

// Unsere 54 afrikanischen Länder als ISO3-Codes. Alles andere in den
// JSON-Dateien (andere Länder, Regionen wie «Sub-Saharan Africa») fliegt raus.
$countryCodes = [
    'DZA', 'AGO', 'BEN', 'BWA', 'BFA', 'BDI', 'CPV', 'CMR', 'CAF', 'TCD',
    'COM', 'COD', 'COG', 'CIV', 'DJI', 'EGY', 'GNQ', 'ERI', 'SWZ', 'ETH',
    'GAB', 'GMB', 'GHA', 'GIN', 'GNB', 'KEN', 'LSO', 'LBR', 'LBY', 'MDG',
    'MWI', 'MLI', 'MRT', 'MUS', 'MAR', 'MOZ', 'NAM', 'NER', 'NGA', 'RWA',
    'STP', 'SEN', 'SYC', 'SLE', 'SOM', 'ZAF', 'SSD', 'SDN', 'TZA', 'TGO',
    'TUN', 'UGA', 'ZMB', 'ZWE',
];

// Zusätzlich der Weltwert der Weltbank (Code WLD) als Vergleich zu Afrika.
// Er wird wie ein Land behandelt: countries bekommt eine Zeile «World».
$countryCodes[] = 'WLD';

// ---------------------------------------------------------------------------
// 1. bis 4. Filtern, umwandeln, zusammenführen
// ---------------------------------------------------------------------------
//
// Welcher Teil der Extract-Rückgabe wird zu welcher Spalte?
// So brauchen wir für beide Indikatoren nur eine einzige Schleife.
$fields = [
    'electricity' => 'access_pct',
    'population'  => 'population',
];

// $rows sammelt die Zeilen unter einem Schlüssel wie «NGA-2023».
// Über diesen Schlüssel finden sich Strom und Bevölkerung.
$rows = [];

// $foundIn merkt sich, in welcher Quelle ein Schlüssel vorkam.
// Damit finden wir am Ende Zeilen ohne Partner.
$foundIn = [];

foreach ($fields as $source => $field) {
    foreach ($raw[$source] as $record) {
        $code = $record['countryiso3code'];

        // 1. Nur unsere 54 Länder. Regionen wie «Sub-Saharan Africa» fliegen raus.
        if (!in_array($code, $countryCodes, true)) {
            continue;
        }

        // 2. Text in ganze Zahl umwandeln: "2023" -> 2023
        $year = (int) $record['date'];
        $key = $code . '-' . $year;

        // 3. Gibt es die Zeile noch nicht, legen wir sie leer an.
        //    Beide Messwerte starten mit null.
        if (!isset($rows[$key])) {
            $rows[$key] = [
                'country_code' => $code,
                'country_name' => $record['country']['value'],
                'year'         => $year,
                'access_pct'   => null,
                'population'   => null,
            ];
        }

        // 4. Wert übernehmen. Ist er null, bleibt er null.
        //    Sonst: Prozent als Kommazahl mit 1 Stelle nach dem Komma,
        //    Bevölkerung als ganze Zahl.
        $value = $record['value'];
        if ($value !== null) {
            $value = ($field === 'access_pct') ? round((float) $value, 1) : (int) $value;
        }
        $rows[$key][$field] = $value;

        $foundIn[$key][] = $source;
    }
}

// Sortieren nach Land, dann Jahr. Das macht die Kontrolle leichter lesbar.
usort($rows, function (array $a, array $b): int {
    return [$a['country_code'], $a['year']] <=> [$b['country_code'], $b['year']];
});

// ---------------------------------------------------------------------------
// 5. Kontrolle
// ---------------------------------------------------------------------------

$countries = array_unique(array_column($rows, 'country_code'));
$missingCountries = array_diff($countryCodes, $countries);

echo "\n--- Kontrolle Transform ---\n";
echo 'Zeilen: ' . count($rows) . "\n";
echo 'Länder (inkl. Welt): ' . count($countries) . ' von ' . count($countryCodes) . "\n";
if ($missingCountries) {
    echo 'Ohne Daten: ' . implode(', ', $missingCountries) . "\n";
}

// Fehlende Werte zählen: Wie viele Zeilen haben null in diesem Feld?
foreach ($fields as $field) {
    $missing = count(array_filter($rows, fn($row) => $row[$field] === null));
    echo "Fehlende Werte {$field}: {$missing}\n";
}

// Zeilen ohne Partner: Der Schlüssel kam nur in einer der beiden Quellen vor.
$withoutPartner = [];
foreach ($foundIn as $key => $sources) {
    if (count($sources) === 1) {
        $withoutPartner[] = $key . ' (nur ' . $sources[0] . ')';
    }
}
echo 'Zeilen ohne Partner: ' . count($withoutPartner) . "\n";
foreach ($withoutPartner as $line) {
    echo "  {$line}\n";
}

// Beispielzeilen nur, wenn transform.php selbst im Browser aufgerufen wird.
if (realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    echo "\nDie ersten drei Zeilen:\n";
    print_r(array_slice($rows, 0, 3));
}

echo "\n";

return $rows;
