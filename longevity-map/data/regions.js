/* ============================================================================
   Subnational life expectancy — "drill down" data for selected countries.
   Click a country on the globe and, if it appears here, the atlas shows which
   region lives longest and which lives shortest, on a mini ranking.

   Tuples are [ name, lifeExpectancy, lat, lon ]. Figures are best-available
   estimates from national statistics offices (rounded); methodology and base
   years vary by country, so compare WITHIN a country, not across.
   ========================================================================== */
window.REGIONS = {

IND: { unit:'India', kind:'States & union territories',
  source:'Govt. of India — Sample Registration System & state estimates',
  r:[
    ['Kerala',78.3,10.5,76.3],['Delhi',76.5,28.6,77.2],['Chandigarh',76.5,30.7,76.8],
    ['Jammu & Kashmir',74.3,33.8,76.6],['Himachal Pradesh',73.5,31.8,77.3],['Punjab',73.0,31.1,75.3],
    ['Maharashtra',72.5,19.5,76.0],['Tamil Nadu',72.2,11.1,78.5],['Uttarakhand',72.0,30.0,79.0],
    ['West Bengal',71.5,23.5,87.9],['Karnataka',70.8,15.0,76.0],['Gujarat',70.8,22.6,71.7],
    ['Haryana',70.3,29.2,76.4],['Andhra Pradesh',70.2,15.9,79.7],['Telangana',70.0,17.9,79.0],
    ['Odisha',70.3,20.5,85.0],['Rajasthan',69.9,27.0,74.2],['Bihar',69.9,25.8,85.8],
    ['Madhya Pradesh',69.8,23.5,78.5],['Uttar Pradesh',69.8,27.0,80.9],['Assam',70.0,26.2,92.9],
    ['Chhattisgarh',69.5,21.3,81.8],
  ]},

USA: { unit:'United States', kind:'States',
  source:'US CDC / National Center for Health Statistics',
  r:[
    ['Hawaii',81.1,21.3,-157.8],['New Jersey',81.1,40.1,-74.7],['New York',81.0,42.9,-75.5],
    ['California',80.9,37.2,-119.5],['Connecticut',80.9,41.6,-72.7],['Massachusetts',80.6,42.3,-71.8],
    ['Minnesota',80.3,46.3,-94.3],['Washington',80.3,47.4,-120.5],['Colorado',80.5,39.0,-105.5],
    ['New Hampshire',79.9,43.7,-71.6],['Florida',79.9,28.6,-82.4],['Rhode Island',79.7,41.7,-71.5],
    ['Texas',78.4,31.5,-99.3],['Illinois',78.6,40.0,-89.2],['Ohio',76.0,40.2,-82.8],
    ['Oklahoma',75.2,35.6,-97.5],['Arkansas',75.0,34.8,-92.4],['Tennessee',75.1,35.8,-86.4],
    ['Kentucky',74.8,37.5,-85.3],['Louisiana',74.5,31.0,-92.0],['Alabama',74.6,32.8,-86.8],
    ['West Virginia',74.0,38.6,-80.6],['Mississippi',73.9,32.7,-89.7],
  ]},

CHN: { unit:'China', kind:'Provinces',
  source:"China's National Bureau of Statistics / census",
  r:[
    ['Shanghai',84.0,31.2,121.5],['Beijing',82.5,39.9,116.4],['Zhejiang',82.0,29.2,120.2],
    ['Tianjin',82.0,39.1,117.2],['Jiangsu',79.5,33.0,120.0],['Guangdong',79.3,23.3,113.4],
    ['Shandong',79.0,36.4,118.5],['Liaoning',78.9,41.3,122.6],['Fujian',78.5,26.0,118.0],
    ['Sichuan',77.5,30.6,102.8],['Hubei',77.0,31.0,112.3],['Henan',76.0,34.0,113.6],
    ['Xinjiang',73.5,41.0,85.0],['Gansu',73.5,37.0,103.7],['Guizhou',73.0,26.8,106.9],
    ['Yunnan',72.5,24.5,101.5],['Qinghai',72.0,35.7,96.0],['Tibet (Xizang)',71.0,31.5,88.0],
  ]},

JPN: { unit:'Japan', kind:'Prefectures',
  source:'Japan Ministry of Health, Labour and Welfare (prefectural life tables)',
  r:[
    ['Shiga',85.0,35.0,136.0],['Nagano',84.8,36.2,138.0],['Kyoto',84.6,35.2,135.5],
    ['Kanagawa',84.5,35.4,139.4],['Fukui',84.5,35.9,136.2],['Okinawa',84.4,26.5,128.0],
    ['Tokyo',84.2,35.7,139.7],['Osaka',83.9,34.6,135.5],['Hokkaido',83.8,43.5,142.5],
    ['Akita',83.4,39.7,140.4],['Aomori',83.0,40.8,140.7],
  ]},

GBR: { unit:'United Kingdom', kind:'Nations & notable areas',
  source:'UK Office for National Statistics',
  r:[
    ['Kensington & Chelsea',84.5,51.5,-0.19],['Hart, Hampshire',83.6,51.3,-0.95],
    ['Northern Ireland',80.6,54.6,-6.5],['Wales',80.4,52.3,-3.8],['England',81.3,52.5,-1.5],
    ['London (avg)',82.5,51.5,-0.12],['Scotland',79.1,56.5,-4.2],['Blackpool',74.9,53.8,-3.05],
    ['Glasgow City',73.6,55.86,-4.25],
  ]},

ITA: { unit:'Italy', kind:'Regions',
  source:'ISTAT (Italian National Institute of Statistics)',
  r:[
    ['Trentino–South Tyrol',84.2,46.4,11.3],['Umbria',83.7,42.9,12.5],['Marche',83.6,43.4,13.2],
    ['Tuscany',83.6,43.5,11.1],['Veneto',83.6,45.6,11.8],['Emilia-Romagna',83.6,44.5,11.2],
    ['Lombardy',83.4,45.6,9.8],['Sardinia',83.0,40.0,9.0],['Lazio',83.0,41.9,12.7],
    ['Sicily',82.3,37.6,14.2],['Campania',81.7,40.9,14.6],
  ]},

ESP: { unit:'Spain', kind:'Autonomous communities',
  source:'INE (Spanish Statistical Office)',
  r:[
    ['Madrid',85.2,40.4,-3.7],['Navarre',84.4,42.8,-1.6],['Castile and León',84.4,41.7,-4.8],
    ['Basque Country',84.0,43.0,-2.6],['La Rioja',84.0,42.3,-2.5],['Catalonia',83.8,41.8,1.7],
    ['Cantabria',83.6,43.2,-4.0],['Galicia',83.2,42.8,-8.0],['Valencia',83.2,39.5,-0.6],
    ['Asturias',82.5,43.3,-6.0],['Andalusia',82.0,37.4,-4.8],['Ceuta & Melilla',81.2,35.3,-2.9],
  ]},

BRA: { unit:'Brazil', kind:'States',
  source:'IBGE (Brazilian Institute of Geography and Statistics)',
  r:[
    ['Santa Catarina',79.9,-27.2,-50.5],['Distrito Federal',79.3,-15.8,-47.9],['Espírito Santo',79.2,-19.6,-40.5],
    ['São Paulo',78.9,-22.0,-48.0],['Rio Grande do Sul',78.5,-30.0,-53.5],['Paraná',78.0,-24.5,-51.5],
    ['Minas Gerais',78.0,-18.5,-44.5],['Rio de Janeiro',77.0,-22.3,-42.7],['Bahia',74.0,-12.5,-41.7],
    ['Pará',73.0,-3.8,-52.5],['Alagoas',72.3,-9.6,-36.6],['Piauí',71.6,-7.5,-42.5],['Maranhão',71.5,-5.0,-45.5],
  ]},

RUS: { unit:'Russia', kind:'Federal subjects',
  source:'Rosstat (Russian Federal State Statistics Service)',
  r:[
    ['Ingushetia',81.5,43.3,45.0],['Dagestan',78.5,43.0,47.0],['Moscow',78.5,55.75,37.6],
    ['North Ossetia',76.0,43.0,44.3],['Chechnya',76.0,43.3,45.7],['St Petersburg',76.0,59.9,30.3],
    ['Krasnodar Krai',73.5,45.4,39.0],['Tatarstan',74.5,55.5,49.5],['Chukotka',68.0,66.0,170.0],
    ['Amur Oblast',68.5,53.0,128.0],['Tuva',67.0,51.7,94.5],
  ]},

AUS: { unit:'Australia', kind:'States & territories',
  source:'Australian Bureau of Statistics',
  r:[
    ['Aust. Capital Territory',84.5,-35.3,149.1],['Victoria',83.5,-37.0,144.5],['New South Wales',83.3,-32.0,147.0],
    ['Western Australia',83.2,-26.0,121.0],['South Australia',83.0,-30.0,135.0],['Queensland',83.0,-22.0,144.0],
    ['Tasmania',81.5,-42.0,147.0],['Northern Territory',78.5,-19.5,133.0],
  ]},

CAN: { unit:'Canada', kind:'Provinces & territories',
  source:'Statistics Canada',
  r:[
    ['British Columbia',83.0,53.7,-127.6],['Ontario',82.5,49.5,-85.0],['Quebec',82.5,52.0,-72.0],
    ['Alberta',82.0,54.0,-115.0],['Prince Edward Island',81.3,46.4,-63.2],['Nova Scotia',80.7,45.0,-63.0],
    ['Manitoba',80.0,54.0,-97.0],['Saskatchewan',80.0,54.0,-106.0],['Northwest Territories',77.5,64.0,-119.0],
    ['Nunavut',71.8,70.0,-90.0],
  ]},

DEU: { unit:'Germany', kind:'States (Länder)',
  source:'Destatis (German Federal Statistical Office)',
  r:[
    ['Baden-Württemberg',82.2,48.6,9.0],['Bavaria',81.8,48.8,11.5],['Hesse',81.4,50.6,9.0],
    ['Hamburg',81.2,53.5,10.0],['Saxony',81.2,51.0,13.5],['Berlin',81.0,52.5,13.4],
    ['North Rhine-Westphalia',80.8,51.5,7.5],['Saarland',80.2,49.4,7.0],
    ['Mecklenburg-Vorpommern',79.8,53.6,12.7],['Saxony-Anhalt',79.6,51.9,11.6],
  ]},

FRA: { unit:'France', kind:'Regions (incl. overseas)',
  source:'INSEE (French National Institute of Statistics)',
  r:[
    ['Île-de-France (Paris)',84.0,48.8,2.4],['Auvergne-Rhône-Alpes',83.5,45.5,4.5],['Occitanie',83.5,43.6,2.0],
    ['Pays de la Loire',83.5,47.5,-0.8],["Provence-Alpes-Côte d'Azur",83.3,43.9,6.0],['Martinique',82.9,14.6,-61.0],
    ['Brittany',82.5,48.2,-2.9],['Guadeloupe',82.0,16.2,-61.5],['Hauts-de-France',81.5,50.0,2.8],
    ['Mayotte',75.0,-12.8,45.2],
  ]},

MEX: { unit:'Mexico', kind:'States',
  source:'INEGI / CONAPO (Mexico)',
  r:[
    ['Nuevo León',76.5,25.6,-99.9],['Baja California Sur',76.0,26.0,-112.0],['Mexico City',76.0,19.4,-99.1],
    ['Coahuila',75.8,27.3,-102.0],['Jalisco',75.5,20.7,-103.5],['Sinaloa',75.0,25.0,-107.5],
    ['Aguascalientes',75.7,22.0,-102.3],['Chiapas',73.6,16.5,-92.5],['Oaxaca',73.5,17.0,-96.5],
    ['Guerrero',73.0,17.5,-99.5],
  ]},

IDN: { unit:'Indonesia', kind:'Provinces',
  source:'BPS (Statistics Indonesia)',
  r:[
    ['Yogyakarta',75.0,-7.8,110.4],['East Kalimantan',74.2,0.5,116.5],['Jakarta',73.0,-6.2,106.8],
    ['Bali',72.5,-8.4,115.2],['Central Java',74.5,-7.2,110.0],['East Java',73.0,-7.8,112.5],
    ['North Sulawesi',72.0,1.0,124.5],['West Nusa Tenggara',67.0,-8.7,117.4],
    ['West Papua',66.0,-1.3,133.2],['Papua',66.0,-4.3,138.1],
  ]},

ZAF: { unit:'South Africa', kind:'Provinces',
  source:'Statistics South Africa',
  r:[
    ['Western Cape',67.7,-33.5,21.5],['Gauteng',66.5,-26.2,28.1],['Limpopo',65.5,-23.4,29.5],
    ['Northern Cape',63.5,-29.0,21.8],['Eastern Cape',62.5,-32.3,26.5],['KwaZulu-Natal',61.5,-28.5,30.5],
    ['Free State',61.0,-28.5,26.8],['Mpumalanga',62.0,-25.5,30.0],
  ]},

};
