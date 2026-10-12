// =========================================================================
// Fast alle haben Strom. Fast.
//
// Ablauf:
//   1. Daten aus unload.php holen (eine Zeile pro Land und Jahr)
//   2. Daten ordnen: pro Jahr und Land, Weltwert separat
//   3. Kennzahlen ausrechnen (alle Zahlen im Text kommen von hier)
//   4. Lichtkarte, Weltbalken und drei Diagramme zeichnen
// =========================================================================

// --- Länder: Code der Datenbank (3 Buchstaben), Code der Karte (2 Buchstaben)
//     und deutscher Name. Die Datenbank liefert englische Namen der Weltbank.
const laender = {
    DZA: { iso2: 'DZ', name: 'Algerien' },
    AGO: { iso2: 'AO', name: 'Angola' },
    BEN: { iso2: 'BJ', name: 'Benin' },
    BWA: { iso2: 'BW', name: 'Botswana' },
    BFA: { iso2: 'BF', name: 'Burkina Faso' },
    BDI: { iso2: 'BI', name: 'Burundi' },
    CPV: { iso2: 'CV', name: 'Kap Verde' },
    CMR: { iso2: 'CM', name: 'Kamerun' },
    CAF: { iso2: 'CF', name: 'Zentralafrikanische Republik' },
    TCD: { iso2: 'TD', name: 'Tschad' },
    COM: { iso2: 'KM', name: 'Komoren' },
    COD: { iso2: 'CD', name: 'DR Kongo' },
    COG: { iso2: 'CG', name: 'Republik Kongo' },
    CIV: { iso2: 'CI', name: 'Elfenbeinküste' },
    DJI: { iso2: 'DJ', name: 'Dschibuti' },
    EGY: { iso2: 'EG', name: 'Ägypten' },
    GNQ: { iso2: 'GQ', name: 'Äquatorialguinea' },
    ERI: { iso2: 'ER', name: 'Eritrea' },
    SWZ: { iso2: 'SZ', name: 'Eswatini' },
    ETH: { iso2: 'ET', name: 'Äthiopien' },
    GAB: { iso2: 'GA', name: 'Gabun' },
    GMB: { iso2: 'GM', name: 'Gambia' },
    GHA: { iso2: 'GH', name: 'Ghana' },
    GIN: { iso2: 'GN', name: 'Guinea' },
    GNB: { iso2: 'GW', name: 'Guinea-Bissau' },
    KEN: { iso2: 'KE', name: 'Kenia' },
    LSO: { iso2: 'LS', name: 'Lesotho' },
    LBR: { iso2: 'LR', name: 'Liberia' },
    LBY: { iso2: 'LY', name: 'Libyen' },
    MDG: { iso2: 'MG', name: 'Madagaskar' },
    MWI: { iso2: 'MW', name: 'Malawi' },
    MLI: { iso2: 'ML', name: 'Mali' },
    MRT: { iso2: 'MR', name: 'Mauretanien' },
    MUS: { iso2: 'MU', name: 'Mauritius' },
    MAR: { iso2: 'MA', name: 'Marokko' },
    MOZ: { iso2: 'MZ', name: 'Mosambik' },
    NAM: { iso2: 'NA', name: 'Namibia' },
    NER: { iso2: 'NE', name: 'Niger' },
    NGA: { iso2: 'NG', name: 'Nigeria' },
    RWA: { iso2: 'RW', name: 'Ruanda' },
    STP: { iso2: 'ST', name: 'São Tomé und Príncipe' },
    SEN: { iso2: 'SN', name: 'Senegal' },
    SYC: { iso2: 'SC', name: 'Seychellen' },
    SLE: { iso2: 'SL', name: 'Sierra Leone' },
    SOM: { iso2: 'SO', name: 'Somalia' },
    ZAF: { iso2: 'ZA', name: 'Südafrika' },
    SSD: { iso2: 'SS', name: 'Südsudan' },
    SDN: { iso2: 'SD', name: 'Sudan' },
    TZA: { iso2: 'TZ', name: 'Tansania' },
    TGO: { iso2: 'TG', name: 'Togo' },
    TUN: { iso2: 'TN', name: 'Tunesien' },
    UGA: { iso2: 'UG', name: 'Uganda' },
    ZMB: { iso2: 'ZM', name: 'Sambia' },
    ZWE: { iso2: 'ZW', name: 'Simbabwe' },
};

// --- Farbstufen der Karte (Anteil mit Strom). Die Farben stehen in style.css.
const stufen = [
    { max: 20, farbe: 'var(--stufe-1)', text: 'unter 20 %' },
    { max: 40, farbe: 'var(--stufe-2)', text: '20–40 %' },
    { max: 60, farbe: 'var(--stufe-3)', text: '40–60 %' },
    { max: 80, farbe: 'var(--stufe-4)', text: '60–80 %' },
    { max: 101, farbe: 'var(--stufe-5)', text: '80–100 %' },
];

// --- Farben für Chart.js (Canvas kennt keine CSS-Variablen, darum hier nochmals)
const farbe = {
    licht: '#f2c14e',
    kreide: '#ece4d0',
    kreideLeise: 'rgba(236, 228, 208, 0.45)',
    kreideSehrLeise: 'rgba(236, 228, 208, 0.22)',
    gras: '#a8a58f',
    raster: 'rgba(236, 228, 208, 0.10)',
};

// --- Elemente der Seite
const statusEl = document.getElementById('status');
const summaryEl = document.getElementById('summary');
const summaryWorldEl = document.getElementById('summary-world');
const mapEl = document.getElementById('map');
const legendEl = document.getElementById('legend');
const tooltipEl = document.getElementById('tooltip');
const yearInput = document.getElementById('year');
const yearLabel = document.getElementById('year-label');

// --- Gespeicherte Daten (werden in init() gefüllt)
const rowsByYear = {};     // rowsByYear[2024]['NG'] = Zeile
const worldByYear = {};    // worldByYear[2024] = Zeile der Welt
const rowsByCode = {};     // rowsByCode['NGA'] = alle Jahre von Nigeria
let jahre = [];            // alle Jahre, sortiert

// Wer keine Bewegung mag, bekommt die Diagramme ohne Animation
const wenigBewegung = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// =========================================================================
// Hilfsfunktionen zum Formatieren
// =========================================================================
const zahl = new Intl.NumberFormat('de-CH');

// 581'082'000 -> "581.1 Mio."
function mio(wert, stellen = 1) {
    return (wert / 1e6).toLocaleString('de-CH', {
        minimumFractionDigits: stellen,
        maximumFractionDigits: stellen,
    }) + '\u00a0Mio.';   // geschütztes Leerzeichen: Zahl und Einheit bleiben zusammen
}

// 61.63 -> "61.6 %"
function prozent(wert, stellen = 1) {
    return wert.toLocaleString('de-CH', {
        minimumFractionDigits: stellen,
        maximumFractionDigits: stellen,
    }) + '\u00a0%';
}

function deutscherName(code) {
    return laender[code] ? laender[code].name : code;
}

// =========================================================================
// Rechnen: Summen für ganz Afrika in einem Jahr
// =========================================================================
function afrikaSumme(jahr) {
    let ohneStrom = 0;      // Menschen ohne Strom
    let bevMitWert = 0;     // Bevölkerung der Länder, für die ein Prozentwert da ist
    let bevGesamt = 0;      // ganze Bevölkerung der 54 Länder

    for (const row of Object.values(rowsByYear[jahr] || {})) {
        if (row.population !== null) {
            bevGesamt += row.population;
        }
        if (row.without_access !== null) {
            ohneStrom += row.without_access;
            bevMitWert += row.population;
        }
    }

    return {
        ohneStrom,
        bevGesamt,
        // Anteil mit Strom, gewichtet nach Bevölkerung
        prozentMitStrom: bevMitWert ? 100 - (ohneStrom / bevMitWert) * 100 : null,
    };
}

// Eine Zeile eines Landes in einem Jahr
function zeile(code, jahr) {
    return (rowsByCode[code] || []).find((r) => r.year === jahr) || null;
}

// Wie viele Länder haben in diesem Jahr mehr als die Hälfte Strom?
function anzahlUeberHalb(jahr) {
    return Object.values(rowsByYear[jahr] || {}).filter((r) => r.access_pct !== null && r.access_pct > 50).length;
}

// Die Länder mit den meisten Menschen ohne Strom, grösste zuerst
function rangliste(jahr, anzahl) {
    return Object.values(rowsByYear[jahr] || {})
        .filter((r) => r.without_access !== null)
        .sort((a, b) => b.without_access - a.without_access)
        .slice(0, anzahl);
}

// =========================================================================
// Alle Zahlen für den Text ausrechnen und in die Seite schreiben
// =========================================================================
function fakten() {
    const start = jahre[0];
    const ende = jahre.at(-1);

    const afrikaStart = afrikaSumme(start);
    const afrikaEnde = afrikaSumme(ende);
    const welt0 = worldByYear[start];
    const welt1 = worldByYear[ende];

    // Höchststand der Menschen ohne Strom
    let spitzeJahr = start;
    for (const jahr of jahre) {
        if (afrikaSumme(jahr).ohneStrom > afrikaSumme(spitzeJahr).ohneStrom) {
            spitzeJahr = jahr;
        }
    }

    // Die drei Länder mit den meisten Menschen ohne Strom
    const top3 = rangliste(ende, 3);
    const top3Summe = top3.reduce((summe, r) => summe + r.without_access, 0);
    const top3Namen = top3.map((r) => deutscherName(r.country_code));

    // Lücken: welche Länder haben in welchen Jahren keinen Prozentwert?
    const luecken = Object.entries(rowsByCode)
        .map(([code, rows]) => {
            const fehlend = rows.filter((r) => r.access_pct === null).map((r) => r.year);
            if (fehlend.length === 0) {
                return null;
            }
            const von = Math.min(...fehlend);
            const bis = Math.max(...fehlend);
            return `${deutscherName(code)} (${von === bis ? von : von + ' bis ' + bis})`;
        })
        .filter(Boolean);

    const ken0 = zeile('KEN', start), ken1 = zeile('KEN', ende);
    const nga0 = zeile('NGA', start), nga1 = zeile('NGA', ende);
    const eth0 = zeile('ETH', start), eth12 = zeile('ETH', 2012);

    const werte = {
        jahrStart: start,
        jahrEnde: ende,
        weltStart: welt0 ? mio(welt0.without_access, 0) : '–',
        weltEnde: welt1 ? mio(welt1.without_access, 0) : '–',
        anteilAfrikaStart: welt0 ? prozent(afrikaStart.ohneStrom / welt0.without_access * 100, 0) : '–',
        anteilAfrikaEnde: welt1 ? prozent(afrikaEnde.ohneStrom / welt1.without_access * 100, 0) : '–',
        afrikaProzentStart: prozent(afrikaStart.prozentMitStrom),
        afrikaProzent2012: prozent(afrikaSumme(2012).prozentMitStrom),
        afrikaProzentEnde: prozent(afrikaEnde.prozentMitStrom),
        afrikaOhneEnde: mio(afrikaEnde.ohneStrom),
        afrikaOhneEndeZahl: (afrikaEnde.ohneStrom / 1e6).toLocaleString('de-CH', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
        afrikaDifferenz: mio(afrikaEnde.ohneStrom - afrikaStart.ohneStrom, 0),
        bevoelkerungPlus: mio(afrikaEnde.bevGesamt - afrikaStart.bevGesamt, 0),
        spitzeJahr: spitzeJahr,
        ueberHalbStart: anzahlUeberHalb(start),
        ueberHalbEnde: anzahlUeberHalb(ende),
        top3Anteil: 'Rund ' + prozent(top3Summe / afrikaEnde.ohneStrom * 100, 0),
        top3Namen: top3Namen.slice(0, -1).join(', ') + ' und ' + top3Namen.at(-1),
        keniaProzentStart: prozent(ken0.access_pct),
        keniaProzentEnde: prozent(ken1.access_pct),
        keniaBevStart: mio(ken0.population, 0),
        keniaBevEnde: mio(ken1.population, 0),
        keniaOhneStart: mio(ken0.without_access, 0),
        keniaOhneEnde: mio(ken1.without_access, 0),
        nigeriaProzentStart: prozent(nga0.access_pct),
        nigeriaProzentEnde: prozent(nga1.access_pct),
        nigeriaBevStart: mio(nga0.population, 0),
        nigeriaBevEnde: mio(nga1.population, 0),
        aethiopienProzentStart: prozent(eth0.access_pct),
        aethiopienProzent2012: prozent(eth12.access_pct),
        luecken: luecken.join(', '),
    };

    // Jedes Element mit data-fakt="name" bekommt seinen Wert
    document.querySelectorAll('[data-fakt]').forEach((el) => {
        const name = el.dataset.fakt;
        if (name in werte) {
            el.textContent = werte[name];
        }
    });
}

// =========================================================================
// Kapitel 1: Weltbalken (zwei Jahre, je Afrika und Rest der Welt)
// =========================================================================
function weltbalken() {
    const start = jahre[0];
    const ende = jahre.at(-1);
    const groesster = Math.max(worldByYear[start].without_access, worldByYear[ende].without_access);
    const container = document.getElementById('weltbalken');

    let html = '';
    for (const jahr of [start, ende]) {
        const welt = worldByYear[jahr].without_access;
        const afrika = afrikaSumme(jahr).ohneStrom;
        const rest = welt - afrika;

        // Breite in Prozent des grössten Balkens
        html += `
            <div class="weltzeile">
                <div class="weltzeile-text">
                    <span><strong>${jahr}</strong>: ${mio(welt, 0)} Menschen ohne Strom</span>
                    <span>davon ${prozent(afrika / welt * 100, 0)} in Afrika</span>
                </div>
                <div class="balken" style="width: ${welt / groesster * 100}%">
                    <div class="balken-afrika" style="flex: ${afrika}" title="Afrika: ${mio(afrika, 0)}"></div>
                    <div class="balken-rest" style="flex: ${rest}" title="Rest der Welt: ${mio(rest, 0)}"></div>
                </div>
            </div>`;
    }

    html += `
        <div class="balken-legende">
            <span><i style="background: var(--licht)"></i>Afrika</span>
            <span><i style="background: rgba(236, 228, 208, 0.22)"></i>Rest der Welt</span>
        </div>`;

    container.innerHTML = html;
}

// =========================================================================
// Kapitel 2: Lichtkarte
// =========================================================================
function farbeFuer(accessPct) {
    if (accessPct === null) {
        return 'var(--keine-daten)';
    }
    return stufen.find((s) => accessPct < s.max).farbe;
}

function drawLegend() {
    legendEl.innerHTML = stufen
        .map((s) => `<span><i style="background:${s.farbe}"></i>${s.text}</span>`)
        .join('') + '<span><i style="background:var(--keine-daten)"></i>keine Daten</span>';
}

// Beschriftungen mit Hinweislinie für die drei Länder mit den meisten
// Menschen ohne Strom. Wie die Wege auf einer Wanderkarte.
function zeichneBeschriftungen(jahr) {
    const svg = mapEl.querySelector('svg');
    let gruppe = svg.querySelector('.beschriftung');
    if (!gruppe) {
        gruppe = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        gruppe.setAttribute('class', 'beschriftung');
        gruppe.setAttribute('aria-hidden', 'true');
        svg.appendChild(gruppe);
    }
    gruppe.innerHTML = '';

    const breite = Number(svg.dataset.breite);
    let belegtLinks = [];
    let belegtRechts = [];

    for (const row of rangliste(jahr, 3)) {
        const path = svg.querySelector(`path[id="${laender[row.country_code].iso2}"]`);
        if (!path) {
            continue;
        }
        // Mitte des Landes
        const box = path.getBBox();
        const x = box.x + box.width / 2;
        let y = box.y + box.height / 2;

        // Westliche Länder werden links beschriftet, östliche rechts
        const links = x < breite * 0.55;
        const belegt = links ? belegtLinks : belegtRechts;
        // Nicht zu nah an eine andere Beschriftung auf derselben Seite
        let textY = y;
        while (belegt.some((b) => Math.abs(b - textY) < 16)) {
            textY += 16;
        }
        belegt.push(textY);

        const textX = links ? -6 : breite + 6;
        const ende = links ? textX + 3 : textX - 3;

        gruppe.innerHTML += `
            <circle cx="${x}" cy="${y}" r="1.1"></circle>
            <line x1="${x}" y1="${y}" x2="${ende}" y2="${textY}"></line>
            <text x="${textX}" y="${textY - 1}" text-anchor="${links ? 'end' : 'start'}">${deutscherName(row.country_code)}</text>
            <text class="wert" x="${textX}" y="${textY + 6}" text-anchor="${links ? 'end' : 'start'}">${mio(row.without_access)} ohne Strom</text>`;
    }
}

function drawYear(year) {
    year = Number(year);
    yearLabel.textContent = year;
    yearInput.value = year;
    const rows = rowsByYear[year] || {};

    for (const [iso2, row] of Object.entries(rows)) {
        const path = mapEl.querySelector(`path[id="${iso2}"]`);
        if (path) {
            path.style.fill = farbeFuer(row.access_pct);
        }
    }

    const afrika = afrikaSumme(year);

    // Zuerst die Welt, dann Afrika
    const world = worldByYear[year];
    if (world && world.without_access) {
        const africaShare = Math.round(afrika.ohneStrom / world.without_access * 100);
        summaryWorldEl.textContent = `${year}: weltweit ${mio(world.without_access)} Menschen ohne Strom, davon ${africaShare} % in Afrika`;
    } else {
        summaryWorldEl.textContent = '';
    }
    summaryEl.textContent = `${year}: ${mio(afrika.ohneStrom)} Menschen in Afrika ohne Strom`;

    zeichneBeschriftungen(year);
}

function showTooltip(event) {
    const row = rowsByYear[yearInput.value]?.[event.target.id];
    if (!row) {
        return;
    }
    tooltipEl.innerHTML = `
        <strong>${deutscherName(row.country_code)}</strong><br>
        Mit Strom: ${row.access_pct === null ? 'keine Daten' : prozent(row.access_pct)}<br>
        Ohne Strom: ${row.without_access === null ? 'keine Daten' : zahl.format(row.without_access)}<br>
        Bevölkerung: ${zahl.format(row.population)}`;

    // Tooltip nicht über den rechten Rand hinaus schieben
    const x = Math.min(event.clientX + 14, window.innerWidth - 240);
    tooltipEl.style.left = x + 'px';
    tooltipEl.style.top = event.clientY + 14 + 'px';
    tooltipEl.hidden = false;
}

function karteEinsetzen(svgText) {
    // SVG direkt in die Seite einsetzen, damit wir die Länder einfärben können
    mapEl.innerHTML = svgText;
    const svg = mapEl.querySelector('svg');
    const breite = Number(svg.getAttribute('width'));
    const hoehe = Number(svg.getAttribute('height'));
    svg.dataset.breite = breite;

    // Die Datei hat keine viewBox. Auf grossen Bildschirmen geben wir links und
    // rechts Platz für die Beschriftungen dazu (je 70 Einheiten). Auf dem Handy
    // sind die Beschriftungen ausgeblendet, dort bekommt die Karte die ganze Breite.
    const rand = window.matchMedia('(max-width: 760px)').matches ? 0 : 70;
    svg.setAttribute('viewBox', `${-rand} 0 ${breite + 2 * rand} ${hoehe}`);
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Karte Afrikas: Anteil der Bevölkerung mit Strom pro Land');

    // Unsere 54 Länder markieren und mit Tooltip versehen
    for (const { iso2 } of Object.values(laender)) {
        const path = svg.querySelector(`path[id="${iso2}"]`);
        if (!path) {
            continue;
        }
        path.classList.add('country');
        path.addEventListener('mousemove', showTooltip);
        path.addEventListener('click', showTooltip);   // auf dem Handy: antippen
        path.addEventListener('mouseleave', () => (tooltipEl.hidden = true));
    }

    // Beim Scrollen verschwindet der Tooltip, sonst bleibt er auf dem Handy hängen
    window.addEventListener('scroll', () => (tooltipEl.hidden = true), { passive: true });
}

// Scrollytelling: Kommt ein Textschritt in die Mitte, zeigt die Karte sein Jahr
function scrollSchritte() {
    const schritte = document.querySelectorAll('.schritt');
    const beobachter = new IntersectionObserver((eintraege) => {
        for (const eintrag of eintraege) {
            if (eintrag.isIntersecting) {
                schritte.forEach((s) => s.classList.remove('aktiv'));
                eintrag.target.classList.add('aktiv');
                drawYear(eintrag.target.dataset.jahr);
            }
        }
    }, { rootMargin: '-45% 0px -45% 0px' });   // nur die Mitte des Fensters zählt

    schritte.forEach((s) => beobachter.observe(s));
}

// =========================================================================
// Chart.js: gemeinsame Einstellungen und ein kleines Plugin für Beschriftungen
// =========================================================================
function chartGrundeinstellungen() {
    Chart.defaults.color = farbe.gras;
    Chart.defaults.font.family = '"Josefin Sans", "Futura", sans-serif';
    Chart.defaults.font.size = 13;
    Chart.defaults.borderColor = farbe.raster;
    Chart.defaults.plugins.legend.display = false;   // wir beschriften direkt
    Chart.defaults.plugins.tooltip.backgroundColor = '#262b21';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(236, 228, 208, 0.18)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.titleColor = farbe.kreide;
    Chart.defaults.plugins.tooltip.bodyColor = farbe.kreide;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.maintainAspectRatio = false;
    if (wenigBewegung) {
        Chart.defaults.animation = false;
    }

    // Plugin «beschriftungen»: schreibt Text an einzelne Punkte oder Balken.
    // In den Optionen eines Diagramms: plugins.beschriftungen.punkte = [
    //   { dataset: 0, index: 5, text: '...', dx: 0, dy: -14, align: 'center' } ]
    Chart.register({
        id: 'beschriftungen',
        afterDatasetsDraw(chart, args, optionen) {
            const ctx = chart.ctx;
            for (const p of optionen.punkte || []) {
                const element = chart.getDatasetMeta(p.dataset).data[p.index];
                if (!element) {
                    continue;
                }
                ctx.save();
                ctx.font = `${p.fett ? '600' : '400'} 13px "Josefin Sans", sans-serif`;
                ctx.fillStyle = p.farbe || farbe.kreide;
                ctx.textAlign = p.align || 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(p.text, element.x + (p.dx || 0), element.y + (p.dy || 0));
                ctx.restore();
            }
        },
    });
}

// Ein Diagramm erst zeichnen, wenn es ins Bild scrollt (dann sieht man die Animation)
function zeichneWennSichtbar(canvasId, erstelleDiagramm) {
    const canvas = document.getElementById(canvasId);
    const beobachter = new IntersectionObserver((eintraege) => {
        if (eintraege[0].isIntersecting) {
            erstelleDiagramm(canvas);
            beobachter.disconnect();
        }
    }, { threshold: 0.3 });
    beobachter.observe(canvas);
}

// --- Kapitel 3: Menschen ohne Strom in Afrika, mit Linie auf dem Stand des Startjahres
function diagrammTrend(canvas) {
    const werte = jahre.map((j) => afrikaSumme(j).ohneStrom / 1e6);
    const spitze = werte.indexOf(Math.max(...werte));
    const letzter = werte.length - 1;

    new Chart(canvas, {
        type: 'line',
        data: {
            labels: jahre,
            datasets: [
                {
                    label: 'Menschen ohne Strom',
                    data: werte,
                    borderColor: farbe.licht,
                    backgroundColor: farbe.licht,
                    borderWidth: 2.5,
                    pointRadius: 3,
                    pointHoverRadius: 6,
                    tension: 0,   // gerade Linien: keine erfundenen Bögen zwischen den Jahren
                },
                {
                    label: `Stand ${jahre[0]}`,
                    data: jahre.map(() => werte[0]),
                    borderColor: farbe.kreideLeise,
                    borderDash: [5, 5],
                    borderWidth: 1.5,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                },
            ],
        },
        options: {
            layout: { padding: { top: 30, right: 20 } },
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: {
                    min: 0,
                    title: { display: true, text: 'Mio. Menschen ohne Strom' },
                },
                x: {
                    grid: { display: false },
                    ticks: { autoSkip: true, maxTicksLimit: 7, maxRotation: 0 },
                },
            },
            plugins: {
                tooltip: {
                    filter: (item) => item.datasetIndex === 0,
                    callbacks: {
                        label: (item) => ` ${item.parsed.y.toFixed(1)} Mio. ohne Strom`,
                    },
                },
                beschriftungen: {
                    punkte: [
                        { dataset: 0, index: 0, text: `${werte[0].toFixed(1)} Mio.`, dy: 16, align: 'left', farbe: farbe.gras },
                        { dataset: 0, index: spitze, text: `Höchststand ${jahre[spitze]}: ${werte[spitze].toFixed(1)} Mio.`, dy: -18 },
                        { dataset: 0, index: letzter, text: `${werte[letzter].toFixed(1)} Mio.`, dy: -18, align: 'right', farbe: farbe.licht, fett: true },
                    ],
                },
            },
        },
    });
}

// --- Kapitel 4: Die zehn Länder mit den meisten Menschen ohne Strom
function diagrammTop10(canvas) {
    const ende = jahre.at(-1);
    const top = rangliste(ende, 10);
    const werte = top.map((r) => r.without_access / 1e6);

    new Chart(canvas, {
        type: 'bar',
        data: {
            labels: top.map((r) => deutscherName(r.country_code)),
            datasets: [{
                label: 'Menschen ohne Strom',
                data: werte,
                // Die drei grössten im Licht, der Rest leise
                backgroundColor: top.map((r, i) => (i < 3 ? farbe.licht : farbe.kreideSehrLeise)),
                borderRadius: 3,
                barPercentage: 0.75,
            }],
        },
        options: {
            indexAxis: 'y',   // waagrechte Balken, Ländernamen gut lesbar
            layout: { padding: { right: 70 } },
            scales: {
                x: {
                    min: 0,
                    title: { display: true, text: 'Mio. Menschen ohne Strom' },
                },
                y: {
                    grid: { display: false },
                    ticks: { color: farbe.kreide },
                },
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (item) => ` ${item.parsed.x.toFixed(1)} Mio. ohne Strom`,
                    },
                },
                beschriftungen: {
                    punkte: werte.map((w, i) => ({
                        dataset: 0, index: i, text: `${w.toFixed(1)} Mio.`, dx: 8, align: 'left',
                        farbe: i < 3 ? farbe.kreide : farbe.gras,
                    })),
                },
            },
        },
    });
}

// --- Kapitel 5: Kenia gegen Nigeria
function diagrammKenia(canvas) {
    const kenia = rowsByCode.KEN.map((r) => (r.without_access === null ? null : r.without_access / 1e6));
    const nigeria = rowsByCode.NGA.map((r) => (r.without_access === null ? null : r.without_access / 1e6));
    const letzter = jahre.length - 1;

    new Chart(canvas, {
        type: 'line',
        data: {
            labels: jahre,
            datasets: [
                {
                    label: 'Nigeria',
                    data: nigeria,
                    borderColor: farbe.kreideLeise,
                    backgroundColor: farbe.kreideLeise,
                    borderWidth: 2,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    tension: 0,   // gerade Linien: keine erfundenen Bögen zwischen den Jahren
                },
                {
                    label: 'Kenia',
                    data: kenia,
                    borderColor: farbe.licht,
                    backgroundColor: farbe.licht,
                    borderWidth: 2.5,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    tension: 0,   // gerade Linien: keine erfundenen Bögen zwischen den Jahren
                },
            ],
        },
        options: {
            layout: { padding: { right: 110, top: 10 } },
            interaction: { mode: 'index', intersect: false },
            scales: {
                y: {
                    min: 0,
                    title: { display: true, text: 'Mio. Menschen ohne Strom' },
                },
                x: {
                    grid: { display: false },
                    ticks: { autoSkip: true, maxTicksLimit: 7, maxRotation: 0 },
                },
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (item) => ` ${item.dataset.label}: ${item.parsed.y.toFixed(1)} Mio.`,
                    },
                },
                // Namen direkt ans Linienende statt einer Legende
                beschriftungen: {
                    punkte: [
                        { dataset: 0, index: letzter, text: `Nigeria ${nigeria[letzter].toFixed(1)} Mio.`, dx: 10, align: 'left', farbe: farbe.kreide },
                        { dataset: 1, index: letzter, text: `Kenia ${kenia[letzter].toFixed(1)} Mio.`, dx: 10, align: 'left', farbe: farbe.licht, fett: true },
                    ],
                },
            },
        },
    });
}

// =========================================================================
// Start
// =========================================================================
async function init() {
    // Karte und Daten gleichzeitig laden
    const [svgText, data] = await Promise.all([
        fetch('svg/africa_map.svg').then((r) => r.text()),
        fetch('unload.php').then((r) => r.json()),
    ]);

    if (!Array.isArray(data)) {
        statusEl.textContent = 'Fehler von unload.php: ' + (data.error ?? 'unbekannt');
        return;
    }

    statusEl.textContent = `${data.length} Zeilen aus der Datenbank geladen.`;

    // Daten ordnen
    for (const row of data) {
        // Der Weltwert (WLD) ist kein Land auf der Karte und zählt nicht zu Afrika.
        if (row.country_code === 'WLD') {
            worldByYear[row.year] = row;
            continue;
        }
        const land = laender[row.country_code];
        if (!land) {
            continue;
        }
        rowsByYear[row.year] ??= {};
        rowsByYear[row.year][land.iso2] = row;
        rowsByCode[row.country_code] ??= [];
        rowsByCode[row.country_code].push(row);
    }
    jahre = Object.keys(rowsByYear).map(Number).sort((a, b) => a - b);

    // Regler auf die Jahre der Daten einstellen
    yearInput.min = jahre[0];
    yearInput.max = jahre.at(-1);

    fakten();
    weltbalken();

    karteEinsetzen(svgText);
    drawLegend();
    drawYear(jahre.at(-1));
    yearInput.addEventListener('input', () => drawYear(yearInput.value));
    scrollSchritte();

    chartGrundeinstellungen();
    zeichneWennSichtbar('chart-trend', diagrammTrend);
    zeichneWennSichtbar('chart-top10', diagrammTop10);
    zeichneWennSichtbar('chart-kenia', diagrammKenia);
}

init().catch((error) => {
    statusEl.textContent = 'Fehler beim Laden: ' + error.message;
});
