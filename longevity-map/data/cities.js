/* ============================================================================
   The world's longest-living cities, city-states and urban areas.
   There is no single global registry of city-level life expectancy, so these
   are best-available figures stitched from national statistics offices, city
   public-health reports and demographic studies (rounded, recent years).
   Compare as a guide, not a precise league table. type: 'state' = city-state
   or territory governed as a city; 'metro' = a city / metropolitan area.
   ========================================================================== */
window.CITIES = [
  { n:'Monaco',               c:'Monaco',        iso:'MCO', le:86.0, lat:43.73, lon:7.42,  type:'state', note:'Wealthy Mediterranean city-state; the single highest national figure on Earth.' },
  { n:'Hong Kong',            c:'Hong Kong SAR', iso:'HKG', le:85.5, lat:22.32, lon:114.17, type:'state', note:'Held the world\'s highest life expectancy for much of the 21st century; women near 88.' },
  { n:'San Marino',           c:'San Marino',    iso:'SMR', le:85.5, lat:43.94, lon:12.46, type:'state', note:'Tiny, prosperous Apennine republic with top-tier Italian-style healthcare.' },
  { n:'Madrid',               c:'Spain',         iso:'ESP', le:85.2, lat:40.42, lon:-3.70, type:'metro', note:'Spain\'s capital leads a country on track to overtake Japan for #1.' },
  { n:'Macau',                c:'Macau SAR',     iso:'MAC', le:85.0, lat:22.20, lon:113.54, type:'state', note:'Dense, rich Pearl-River city; rivals Hong Kong at the very top.' },
  { n:'Marin County (SF Bay)',c:'United States', iso:'USA', le:84.9, lat:38.07, lon:-122.75,type:'metro', note:'The longest-lived corner of the US — affluent, active, north of San Francisco.' },
  { n:'Seoul',                c:'South Korea',   iso:'KOR', le:84.8, lat:37.57, lon:126.98, type:'metro', note:'South Korea\'s capital; the nation has the fastest-rising longevity on record.' },
  { n:'Tokyo',                c:'Japan',         iso:'JPN', le:84.5, lat:35.68, lon:139.69, type:'metro', note:'World\'s largest metro, yet among its longest-lived — fish, walking, low obesity.' },
  { n:'Kanagawa / Yokohama',  c:'Japan',         iso:'JPN', le:84.5, lat:35.44, lon:139.64, type:'metro', note:'Greater-Tokyo prefecture with some of Japan\'s highest life expectancy.' },
  { n:'Florence',             c:'Italy',         iso:'ITA', le:84.3, lat:43.77, lon:11.26, type:'metro', note:'Tuscany\'s heart — Mediterranean diet and one of Italy\'s healthiest regions.' },
  { n:'Paris',                c:'France',        iso:'FRA', le:84.2, lat:48.86, lon:2.35,  type:'metro', note:'Île-de-France posts France\'s highest life expectancy.' },
  { n:'Zurich',               c:'Switzerland',   iso:'CHE', le:84.2, lat:47.37, lon:8.54,  type:'metro', note:'Swiss prosperity, alpine air and a famously efficient health system.' },
  { n:'Trento',               c:'Italy',         iso:'ITA', le:84.2, lat:46.07, lon:11.12, type:'metro', note:'Capital of Trentino–South Tyrol, Italy\'s longest-lived region.' },
  { n:'Sydney',               c:'Australia',     iso:'AUS', le:84.0, lat:-33.87,lon:151.21,type:'metro', note:'Australia routinely cracks the global top five; Sydney leads its big cities.' },
  { n:'Barcelona',            c:'Spain',         iso:'ESP', le:84.0, lat:41.39, lon:2.17,  type:'metro', note:'Catalan-Mediterranean diet and strong primary care.' },
  { n:'Singapore',            c:'Singapore',     iso:'SGP', le:84.0, lat:1.35,  lon:103.82,type:'state', note:'The "engineered" Blue Zone — long life by deliberate urban design and policy.' },
  { n:'Geneva',               c:'Switzerland',   iso:'CHE', le:84.0, lat:46.20, lon:6.14,  type:'metro', note:'Lakeside Swiss city; high incomes and excellent healthcare access.' },
  { n:'Andorra la Vella',     c:'Andorra',       iso:'AND', le:84.0, lat:42.51, lon:1.52,  type:'state', note:'Capital of a Pyrenean micro-state that quietly ranks in the world top ten.' },
  { n:'Vancouver',            c:'Canada',        iso:'CAN', le:84.0, lat:49.28, lon:-123.12,type:'metro', note:'British Columbia leads Canada; mild, active, outdoorsy west-coast living.' },
  { n:'Milan',                c:'Italy',         iso:'ITA', le:83.9, lat:45.46, lon:9.19,  type:'metro', note:'Wealthy Lombardy; high incomes and strong northern-Italian healthcare.' },
  { n:'Stockholm',            c:'Sweden',        iso:'SWE', le:83.8, lat:59.33, lon:18.07, type:'metro', note:'Nordic welfare-state health system and active lifestyles.' },
  { n:'Tel Aviv',             c:'Israel',        iso:'ISR', le:83.8, lat:32.08, lon:34.78, type:'metro', note:'Israel ranks among the world\'s longest-lived nations, men especially.' },
  { n:'Melbourne',            c:'Australia',     iso:'AUS', le:83.8, lat:-37.81,lon:144.96,type:'metro', note:'Victoria rivals the ACT for Australia\'s top life expectancy.' },
  { n:'Gibraltar',            c:'Gibraltar',     iso:'GIB', le:83.5, lat:36.14, lon:-5.35, type:'state', note:'British territory with a Mediterranean-meets-British-NHS profile.' },
  { n:'Toronto',              c:'Canada',        iso:'CAN', le:83.5, lat:43.65, lon:-79.38,type:'metro', note:'Ontario\'s big multicultural metro; high immigrant-health advantage.' },
  { n:'Oslo',                 c:'Norway',        iso:'NOR', le:83.5, lat:59.91, lon:10.75, type:'metro', note:'Norwegian wealth and a strong public-health system.' },
  { n:'Vienna',               c:'Austria',       iso:'AUT', le:82.8, lat:48.21, lon:16.37, type:'metro', note:'Regularly tops "most liveable city" lists; strong universal healthcare.' },
  { n:'London',               c:'United Kingdom',iso:'GBR', le:82.5, lat:51.51, lon:-0.13, type:'metro', note:'Wide internal gap — Kensington & Chelsea reach ~84.5, far above the UK average.' },
  { n:'Honolulu',             c:'United States', iso:'USA', le:82.5, lat:21.31, lon:-157.86,type:'metro', note:'Hawaii is the longest-lived US state; Honolulu is its core.' },
  { n:'Shanghai',             c:'China',         iso:'CHN', le:84.0, lat:31.23, lon:121.47,type:'metro', note:'China\'s richest city posts life expectancy on par with Western Europe.' },
];
