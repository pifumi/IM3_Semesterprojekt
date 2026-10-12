-- Das Datenmodell für den Stromzugang in Afrika.
--
-- Anlegen in phpMyAdmin: diesen Text in den Reiter «SQL» einfügen und
-- ausführen. Das passiert genau einmal von Hand. Gefüllt werden die Tabellen
-- danach nur noch von load.php.
--
-- Muster «Stammdaten + Messwerte»:
--   countries           = Stammdaten, jedes Land steht genau einmal hier
--   electricity_access  = Messwerte, ein Land pro Jahr, verweist auf countries

-- ---------------------------------------------------------------------------
-- Tabelle countries: die 54 Länder
-- ---------------------------------------------------------------------------
--
-- Ohne diese Tabelle stünde «Nigeria» 25-mal in der grossen Tabelle, und ein
-- einziger Tippfehler würde ein Land erfinden, das es nicht gibt.
--
-- INT AUTO_INCREMENT PRIMARY KEY  ganze Zahl, die die Datenbank selbst
--                                 hochzählt (1, 2, 3 ...); eindeutige Nummer
--                                 jeder Zeile
-- CHAR(3)                         Text mit genau 3 Zeichen, passt für ISO3-
--                                 Codes wie «NGA»
-- UNIQUE                          jeder Code darf nur einmal vorkommen
-- VARCHAR(100)                    Text mit höchstens 100 Zeichen, für Namen
--                                 wie «Congo, Dem. Rep.»
-- NOT NULL                        das Feld darf nie leer sein

CREATE TABLE countries (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  code CHAR(3)      NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL
);

-- ---------------------------------------------------------------------------
-- Tabelle electricity_access: eine Zeile = ein Land in einem Jahr
-- ---------------------------------------------------------------------------
--
-- INT (country_id)   Nummer des Landes aus countries.id
-- FOREIGN KEY        Fremdschlüssel: Die Datenbank lässt keine Zeile zu,
--                    deren country_id es in countries nicht gibt
-- SMALLINT           ganze Zahl bis 32767, reicht für Jahreszahlen
-- DECIMAL(4,1)       Kommazahl mit 4 Ziffern, davon 1 nach dem Komma,
--                    also z.B. 61.2 oder 100.0 – passt für Prozente
-- BIGINT             sehr grosse ganze Zahl; INT reicht nur bis rund
--                    2,1 Milliarden, BIGINT ist für Bevölkerungszahlen sicher
-- NULL               access_pct und population dürfen leer sein: Fehlt ein
--                    Wert bei der Weltbank, steht NULL statt einer falschen 0
-- UNIQUE KEY         dieselbe Kombination aus Land und Jahr darf nur einmal
--                    vorkommen. Darauf baut ON DUPLICATE KEY UPDATE in
--                    load.php auf: ein zweiter Durchlauf aktualisiert, statt
--                    Duplikate anzulegen.

CREATE TABLE electricity_access (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  country_id INT          NOT NULL,
  year       SMALLINT     NOT NULL,
  access_pct DECIMAL(4,1) NULL,
  population BIGINT       NULL,
  UNIQUE KEY country_year (country_id, year),
  FOREIGN KEY (country_id) REFERENCES countries(id)
);
