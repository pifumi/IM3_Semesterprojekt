<?php
/**
 * Unload – liefert die Daten aus der Datenbank als JSON ans Frontend.
 *
 * Antwortet auf:
 *
 *   GET unload.php                alle Länder, alle Jahre
 *   GET unload.php?country=NGA    nur ein Land (ISO3-Code)
 *
 * Eine Zeile der Antwort:
 *   {"country_code":"NGA","country_name":"Nigeria","year":2024,
 *    "access_pct":62.5,"population":232679478,"without_access":87254804}
 *
 * without_access (Menschen ohne Strom) wird erst hier berechnet und steht
 * nicht in der Datenbank. Fehlt einer der beiden Werte, ist es null.
 *
 * Voraussetzung: etl/load.php wurde einmal aufgerufen.
 */

header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/config.php';

// Datenvertrag: genau diese Felder, mit diesen Typen.
// DECIMAL und BIGINT kommen von PDO als Text, deshalb (float) und (int).
function normalizeRow(array $row): array
{
    $accessPct = $row['access_pct'] === null ? null : (float) $row['access_pct'];
    $population = $row['population'] === null ? null : (int) $row['population'];

    $withoutAccess = null;
    if ($accessPct !== null && $population !== null) {
        $withoutAccess = (int) round($population * (100 - $accessPct) / 100);
    }

    return [
        'country_code'   => $row['country_code'],
        'country_name'   => $row['country_name'],
        'year'           => (int) $row['year'],
        'access_pct'     => $accessPct,
        'population'     => $population,
        'without_access' => $withoutAccess,
    ];
}

$country = strtoupper(trim($_GET['country'] ?? ''));

try {
    $pdo = new PDO($dsn, $username, $password, $options);

    $sql = 'SELECT c.code AS country_code,
                   c.name AS country_name,
                   ea.year,
                   ea.access_pct,
                   ea.population
            FROM electricity_access AS ea
            JOIN countries AS c ON c.id = ea.country_id';

    $params = [];

    if ($country !== '') {
        $sql .= ' WHERE c.code = :country';
        $params['country'] = $country;
    }

    $sql .= ' ORDER BY c.code, ea.year';

    $statement = $pdo->prepare($sql);
    $statement->execute($params);

    $data = array_map('normalizeRow', $statement->fetchAll());

    echo json_encode($data, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
} catch (Throwable $error) {
    http_response_code(500);
    error_log('unload.php: ' . $error->getMessage());

    echo json_encode([
        'error' => 'Daten konnten nicht geladen werden.',
    ]);
}
