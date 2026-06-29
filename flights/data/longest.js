/* World's longest non-stop scheduled passenger flights — curated 2026 snapshot.
   Source: Wikipedia "Longest flights" + airline schedules (great-circle distance).
   The OpenFlights routes backbone is a ~2014 snapshot and predates most of these
   ultra-long-haul routes, so this table is maintained separately and authoritative
   for the "Longest flights" view. Distances are great-circle km. */
window.LONGEST_FLIGHTS = [
  { r:1,  a:"JFK", b:"SIN", al:["Singapore Airlines"],            km:15349, dur:"18h 55m", ac:"Airbus A350-900ULR" },
  { r:2,  a:"EWR", b:"SIN", al:["Singapore Airlines"],            km:15344, dur:"19h 10m", ac:"Airbus A350-900ULR" },
  { r:3,  a:"AKL", b:"DOH", al:["Qatar Airways"],                 km:14535, dur:"17h 10m", ac:"Boeing 777-200LR" },
  { r:4,  a:"PER", b:"LHR", al:["Qantas"],                        km:14499, dur:"17h 30m", ac:"Boeing 787-9" },
  { r:5,  a:"DFW", b:"MEL", al:["Qantas"],                        km:14472, dur:"17h 40m", ac:"Boeing 787-9" },
  { r:6,  a:"PER", b:"CDG", al:["Qantas"],                        km:14264, dur:"17h 10m", ac:"Boeing 787-9" },
  { r:7,  a:"JFK", b:"AKL", al:["Air New Zealand","Qantas"],      km:14207, dur:"17h 50m", ac:"Boeing 787-9" },
  { r:8,  a:"AKL", b:"DXB", al:["Emirates"],                      km:14200, dur:"17h 25m", ac:"Airbus A380-800" },
  { r:9,  a:"SZX", b:"MEX", al:["China Southern"],                km:14147, dur:"14h 55m", ac:"Airbus A350-900" },
  { r:10, a:"LAX", b:"SIN", al:["Singapore Airlines"],            km:14114, dur:"17h 50m", ac:"Airbus A350-900" },
  { r:11, a:"IAH", b:"SYD", al:["United Airlines"],               km:13834, dur:"17h 30m", ac:"Boeing 787-9" },
  { r:12, a:"DFW", b:"SYD", al:["Qantas"],                        km:13804, dur:"17h 00m", ac:"Boeing 787-9 / A380" },
  { r:13, a:"JFK", b:"MNL", al:["Philippine Airlines"],          km:13712, dur:"16h 40m", ac:"Airbus A350-900/1000" },
  { r:14, a:"SFO", b:"SIN", al:["United Airlines","Singapore Airlines"], km:13593, dur:"17h 10m", ac:"Boeing 787-9 / A350-900" },
  { r:15, a:"JNB", b:"ATL", al:["Delta Air Lines"],              km:13581, dur:"16h 50m", ac:"Airbus A350-900" },
  { r:16, a:"DXB", b:"LAX", al:["Emirates"],                      km:13420, dur:"16h 20m", ac:"Airbus A380-800" },
  { r:17, a:"JED", b:"LAX", al:["Saudia"],                        km:13409, dur:"16h 10m", ac:"Boeing 777-300ER" },
  { r:18, a:"DOH", b:"LAX", al:["Qatar Airways"],                 km:13367, dur:"16h 00m", ac:"Airbus A350-1000" },
  { r:19, a:"DFW", b:"BNE", al:["American Airlines"],            km:13363, dur:"17h 15m", ac:"Boeing 787-9" },
  { r:20, a:"PER", b:"FCO", al:["Qantas"],                        km:13354, dur:"16h 40m", ac:"Boeing 787-9" },
  { r:21, a:"YYZ", b:"MNL", al:["Philippine Airlines"],          km:13230, dur:"16h 15m", ac:"Airbus A350-900" },
  { r:22, a:"DXB", b:"IAH", al:["Emirates"],                      km:13144, dur:"16h 20m", ac:"Airbus A380-800" },
  { r:23, a:"CPT", b:"ATL", al:["Delta Air Lines"],              km:13084, dur:"16h 20m", ac:"Airbus A350-900" },
  { r:24, a:"DFW", b:"HKG", al:["Cathay Pacific"],               km:13072, dur:"17h 15m", ac:"Airbus A350-900/1000" },
  { r:25, a:"DXB", b:"SFO", al:["Emirates"],                      km:13041, dur:"16h 55m", ac:"Airbus A380-800" },
];
