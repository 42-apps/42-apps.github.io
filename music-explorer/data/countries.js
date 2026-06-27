/* countries.js — canonical country lookup for Music Explorer.
   name -> [iso2, iso3, lat, lng]
   iso2 drives the flag emoji, iso3 matches the GeoJSON choropleth, lat/lng place markers.
   A few cultural "nations" (Scotland, Wales, England, Catalonia, Tibet, Hawaii) get
   special flag handling but borrow a parent ISO3 for the choropleth. */
window.COUNTRIES = {
  // ---- Europe ----
  "United Kingdom": ["GB","GBR",54.0,-2.5],
  "England": ["GB","GBR",52.5,-1.5],
  "Scotland": ["GB","GBR",56.8,-4.2],
  "Wales": ["GB","GBR",52.3,-3.8],
  "Ireland": ["IE","IRL",53.3,-7.7],
  "France": ["FR","FRA",46.6,2.4],
  "Germany": ["DE","DEU",51.2,10.4],
  "Italy": ["IT","ITA",42.8,12.6],
  "Spain": ["ES","ESP",40.0,-3.7],
  "Portugal": ["PT","PRT",39.6,-8.0],
  "Sweden": ["SE","SWE",60.1,18.6],
  "Norway": ["NO","NOR",60.9,9.5],
  "Finland": ["FI","FIN",63.5,26.0],
  "Denmark": ["DK","DNK",56.0,9.5],
  "Iceland": ["IS","ISL",64.9,-18.6],
  "Netherlands": ["NL","NLD",52.2,5.6],
  "Belgium": ["BE","BEL",50.6,4.7],
  "Austria": ["AT","AUT",47.6,14.1],
  "Switzerland": ["CH","CHE",46.8,8.2],
  "Poland": ["PL","POL",51.9,19.4],
  "Czech Republic": ["CZ","CZE",49.8,15.5],
  "Hungary": ["HU","HUN",47.2,19.4],
  "Russia": ["RU","RUS",61.5,90.0],
  "Ukraine": ["UA","UKR",48.4,31.2],
  "Greece": ["GR","GRC",39.1,22.0],
  "Romania": ["RO","ROU",45.9,24.9],
  "Serbia": ["RS","SRB",44.0,21.0],
  "Croatia": ["HR","HRV",45.1,15.5],
  "Bulgaria": ["BG","BGR",42.7,25.5],
  "Estonia": ["EE","EST",58.7,25.0],
  // ---- Americas ----
  "United States": ["US","USA",39.5,-98.4],
  "Canada": ["CA","CAN",56.1,-106.3],
  "Mexico": ["MX","MEX",23.6,-102.5],
  "Brazil": ["BR","BRA",-10.8,-52.9],
  "Argentina": ["AR","ARG",-38.4,-63.6],
  "Colombia": ["CO","COL",4.6,-74.3],
  "Cuba": ["CU","CUB",21.9,-79.6],
  "Jamaica": ["JM","JAM",18.1,-77.3],
  "Puerto Rico": ["PR","PRI",18.2,-66.4],
  "Chile": ["CL","CHL",-35.7,-71.5],
  "Peru": ["PE","PER",-9.2,-75.0],
  "Venezuela": ["VE","VEN",6.4,-66.6],
  "Dominican Republic": ["DO","DOM",18.7,-70.2],
  "Trinidad and Tobago": ["TT","TTO",10.5,-61.3],
  "Bolivia": ["BO","BOL",-16.3,-63.6],
  "Uruguay": ["UY","URY",-32.5,-55.8],
  "Haiti": ["HT","HTI",18.9,-72.3],
  "Panama": ["PA","PAN",8.5,-80.8],
  // ---- Africa ----
  "Nigeria": ["NG","NGA",9.1,8.7],
  "South Africa": ["ZA","ZAF",-29.0,24.0],
  "Ghana": ["GH","GHA",7.9,-1.0],
  "Senegal": ["SN","SEN",14.5,-14.5],
  "Mali": ["ML","MLI",17.6,-4.0],
  "Ethiopia": ["ET","ETH",9.1,40.5],
  "Egypt": ["EG","EGY",26.8,30.8],
  "Morocco": ["MA","MAR",31.8,-7.1],
  "Algeria": ["DZ","DZA",28.0,2.6],
  "DR Congo": ["CD","COD",-4.0,21.8],
  "Kenya": ["KE","KEN",-0.0,37.9],
  "Tanzania": ["TZ","TZA",-6.4,34.9],
  "Zimbabwe": ["ZW","ZWE",-19.0,29.2],
  "Cameroon": ["CM","CMR",7.4,12.4],
  "Ivory Coast": ["CI","CIV",7.5,-5.5],
  "Angola": ["AO","AGO",-11.2,17.9],
  "Tunisia": ["TN","TUN",33.9,9.6],
  "Cape Verde": ["CV","CPV",16.0,-24.0],
  // ---- Asia & Middle East ----
  "India": ["IN","IND",22.0,79.0],
  "Japan": ["JP","JPN",36.2,138.3],
  "South Korea": ["KR","KOR",36.5,127.8],
  "China": ["CN","CHN",35.9,104.2],
  "Indonesia": ["ID","IDN",-2.5,118.0],
  "Philippines": ["PH","PHL",12.9,121.8],
  "Thailand": ["TH","THA",15.1,101.0],
  "Vietnam": ["VN","VNM",16.0,108.0],
  "Pakistan": ["PK","PAK",30.4,69.3],
  "Bangladesh": ["BD","BGD",23.7,90.4],
  "Iran": ["IR","IRN",32.4,53.7],
  "Turkey": ["TR","TUR",39.0,35.2],
  "Israel": ["IL","ISR",31.4,35.0],
  "Lebanon": ["LB","LBN",33.9,35.9],
  "Saudi Arabia": ["SA","SAU",24.0,45.0],
  "Malaysia": ["MY","MYS",4.2,101.9],
  "Sri Lanka": ["LK","LKA",7.9,80.7],
  "Nepal": ["NP","NPL",28.4,84.1],
  "Mongolia": ["MN","MNG",46.9,103.8],
  // ---- Oceania ----
  "Australia": ["AU","AUS",-25.7,134.5],
  "New Zealand": ["NZ","NZL",-41.8,172.8],
  "Hawaii": ["US","USA",20.8,-156.3],
  "Fiji": ["FJ","FJI",-17.7,178.0],
  "Samoa": ["WS","WSM",-13.8,-172.1],
  "Papua New Guinea": ["PG","PNG",-6.3,143.9],
  "Tonga": ["TO","TON",-21.2,-175.2],
  // ---- added from research coverage ----
  "Armenia": ["AM","ARM",40.1,45.0],
  "Azerbaijan": ["AZ","AZE",40.4,47.6],
  "Barbados": ["BB","BRB",13.2,-59.5],
  "Cambodia": ["KH","KHM",12.6,104.9],
  "Georgia": ["GE","GEO",42.3,43.4],
  "Guinea": ["GN","GIN",9.9,-9.7],
  "Guyana": ["GY","GUY",4.9,-58.9],
  "Iraq": ["IQ","IRQ",33.2,43.7],
  "Kazakhstan": ["KZ","KAZ",48.0,67.0],
  "Laos": ["LA","LAO",19.9,102.5],
  "Madagascar": ["MG","MDG",-18.8,46.9],
  "Togo": ["TG","TGO",8.6,0.8],
  "Uganda": ["UG","UGA",1.4,32.3]
};

/* Special non-ISO flags that the regional-indicator trick can't produce. */
window.SPECIAL_FLAGS = {
  "Scotland": "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}",
  "Wales":    "\u{1F3F4}\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}",
  "England":  "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}",
  "Hawaii":   "\u{1F308}"
};

/* iso2 -> flag emoji via Unicode regional indicators; special cases first. */
window.flagFor = function (country, iso2) {
  if (window.SPECIAL_FLAGS[country]) return window.SPECIAL_FLAGS[country];
  if (!iso2 || iso2.length !== 2) return "\u{1F3F3}";
  return String.fromCodePoint(...[...iso2.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
};
