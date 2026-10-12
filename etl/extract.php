<?php
/**
 * Extract – liest die gespeicherten Weltbank-Daten.
 *
 * Die beiden JSON-Dateien im Projektordner sind ein fester, historischer
 * Datenstand der Weltbank (2000 bis zum aktuellsten verfügbaren Jahr):
 *   electricity-access.json  Indikator EG.ELC.ACCS.ZS, Anteil mit Strom in %
 *   population-total.json    Indikator SP.POP.TOTL, Bevölkerung total
 *
 * Es gibt keinen Live-Abruf. Das macht die Kette stabil, auch ohne Netz.
 *
 * Rückgabe mit return, transform.php holt sie mit include:
 *   ['electricity' => [...Datensätze...], 'population' => [...Datensätze...]]
 *
 * Direkt im Browser aufgerufen zeigt die Datei zur Kontrolle je einen
 * Beispiel-Datensatz mit print_r.
 */

// Alle ETL-Dateien geben reinen Text aus, keine Webseite.
header('Content-Type: text/plain; charset=utf-8');

// Welche Datei gehört zu welchem Teil der Rückgabe?
// Die Dateien liegen eine Ebene über etl/ im Projektordner.
$files = [
    'electricity' => __DIR__ . '/../electricity-access.json',
    'population'  => __DIR__ . '/../population-total.json',
];

$result = [];

foreach ($files as $key => $file) {
    // Die Weltbank-Antwort ist ein Array: [0] = Metadaten, [1] = Datensätze.
    // Wir geben nur die Datensätze weiter.
    $data = json_decode(file_get_contents($file), true, 512, JSON_THROW_ON_ERROR);
    $result[$key] = $data[1];
}

// Kontrolle, nur wenn extract.php selbst im Browser aufgerufen wird.
// Wird die Datei per include geholt, ist SCRIPT_FILENAME die andere Datei.
if (realpath($_SERVER['SCRIPT_FILENAME']) === __FILE__) {
    echo count($result['electricity']) . " Datensätze Stromzugang, "
        . count($result['population']) . " Datensätze Bevölkerung.\n\n";
    echo "Erster Datensatz Stromzugang:\n";
    print_r($result['electricity'][0]);
    echo "\nErster Datensatz Bevölkerung:\n";
    print_r($result['population'][0]);
}

return $result;
