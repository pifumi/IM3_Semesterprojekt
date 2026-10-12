<?php
/**
 * Load – schreibt das Ergebnis des Transforms in die Datenbank.
 *
 * Datenfluss dieser Datei:
 *
 *   rund 1350 Zeilen aus transform.php
 *     -> 54 Länder in countries               (suchen, sonst anlegen)
 *       -> 1350 Zeilen in electricity_access  (prepare einmal, execute oft)
 *
 * load.php darf man beliebig oft aufrufen: Dank UNIQUE (country_id, year) und
 * ON DUPLICATE KEY UPDATE werden bestehende Zeilen aktualisiert statt doppelt
 * angelegt.
 *
 * Voraussetzung: Die Tabellen aus schema.sql existieren schon.
 */

// ---------------------------------------------------------------------------
// 1. Ausgabe als reiner Text, Zugangsdaten, Transform holen
// ---------------------------------------------------------------------------

header('Content-Type: text/plain; charset=utf-8');

// Bricht unten etwas ab (z.B. weil eine Tabelle fehlt), zeigt der Server
// sonst nur eine leere Fehlerseite. So steht der Grund als Text im Browser.
set_exception_handler(function (Throwable $e) {
    echo "\nFehler: " . $e->getMessage() . "\n";
});

// config.php liegt im Projektordner, eine Ebene über etl/.
require __DIR__ . '/../config.php';

// transform.php gibt die fertigen Zeilen zurück und druckt dabei seine
// Kontrolle aus. Die erscheint deshalb oben in dieser Ausgabe.
$rows = include __DIR__ . '/transform.php';

// ---------------------------------------------------------------------------
// 2. Verbindung aufbauen
// ---------------------------------------------------------------------------

try {
    $pdo = new PDO($dsn, $username, $password, $options);
} catch (PDOException $e) {
    exit('Verbindung fehlgeschlagen: ' . $e->getMessage() . "\n");
}

// ---------------------------------------------------------------------------
// 3. Länder suchen, sonst anlegen
// ---------------------------------------------------------------------------
//
// Im Transform steht «NGA», in electricity_access braucht es die id von
// Nigeria aus der Tabelle countries.

$findCountry   = $pdo->prepare('SELECT id FROM countries WHERE code = ?');
$insertCountry = $pdo->prepare('INSERT INTO countries (code, name) VALUES (?, ?)');

// Merkzettel: Ländercode => id. Ohne ihn würden wir 1350-mal suchen statt 54-mal,
// denn jede Zeile nennt ihr Land erneut.
$countryIds = [];
$newCountries = 0;

foreach ($rows as $row) {
    $code = $row['country_code'];

    // Schon nachgeschlagen? Dann weiter zur nächsten Zeile.
    if (isset($countryIds[$code])) {
        continue;
    }

    // fetchColumn() liefert die id oder false, wenn es das Land noch nicht gibt.
    $findCountry->execute([$code]);
    $id = $findCountry->fetchColumn();

    if ($id === false) {
        $insertCountry->execute([$code, $row['country_name']]);
        $id = $pdo->lastInsertId();
        $newCountries++;
    }

    $countryIds[$code] = (int) $id;
}

// ---------------------------------------------------------------------------
// 4. Messwerte schreiben
// ---------------------------------------------------------------------------
//
// prepare() steht vor der Schleife und läuft einmal, execute() läuft pro Zeile.
//
// ON DUPLICATE KEY UPDATE: Gibt es Land + Jahr schon (UNIQUE-Schlüssel),
// überschreibt MySQL nur die beiden Messwerte, statt eine zweite Zeile anzulegen.
// VALUES(access_pct) heisst: der Wert, den wir gerade einfügen wollten.

$saveMeasurement = $pdo->prepare(
    'INSERT INTO electricity_access (country_id, year, access_pct, population)
     VALUES (:country_id, :year, :access_pct, :population)
     ON DUPLICATE KEY UPDATE
       access_pct = VALUES(access_pct),
       population = VALUES(population)'
);

// rowCount() verrät, was MySQL gemacht hat:
//   1 = neue Zeile, 2 = bestehende Zeile geändert, 0 = Werte waren schon gleich
$inserted = 0;
$updated = 0;
$unchanged = 0;

foreach ($rows as $row) {
    $saveMeasurement->execute([
        'country_id' => $countryIds[$row['country_code']],
        'year'       => $row['year'],
        'access_pct' => $row['access_pct'],
        'population' => $row['population'],
    ]);

    $count = $saveMeasurement->rowCount();
    if ($count === 1) {
        $inserted++;
    } elseif ($count === 2) {
        $updated++;
    } else {
        $unchanged++;
    }
}

// ---------------------------------------------------------------------------
// 5. Ergebnis melden
// ---------------------------------------------------------------------------

$total = $pdo->query('SELECT COUNT(*) FROM electricity_access')->fetchColumn();

echo "--- Load ---\n";
echo 'Länder: ' . count($countryIds) . " verarbeitet, davon {$newCountries} neu angelegt.\n";
echo 'Zeilen: ' . count($rows) . " verarbeitet, davon {$inserted} neu, "
    . "{$updated} aktualisiert, {$unchanged} unverändert.\n";
echo "In electricity_access stehen jetzt {$total} Zeilen.\n";
