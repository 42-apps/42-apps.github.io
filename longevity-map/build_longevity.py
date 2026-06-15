#!/usr/bin/env python3
"""Fetch World Bank life-expectancy data and emit data/longevity.js for the Longevity Map."""
import json, urllib.request, sys, os

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "longevity.js")
Y0, Y1 = 1960, 2022

def get(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=60) as r:
                return json.load(r)
        except Exception as e:
            sys.stderr.write(f"retry {attempt} {e}\n")
    raise SystemExit("failed: " + url)

# 1) country list -> real countries only (exclude aggregates)
meta = {}
page = 1
while True:
    d = get(f"https://api.worldbank.org/v2/country?format=json&per_page=300&page={page}")
    info, rows = d[0], d[1]
    for c in rows:
        if c.get("region", {}).get("value") == "Aggregates":
            continue
        iso3 = c["id"]
        meta[iso3] = {
            "name": c["name"],
            "region": c.get("region", {}).get("value", ""),
            "income": c.get("incomeLevel", {}).get("value", ""),
            "lat": float(c["latitude"]) if c.get("latitude") else None,
            "lon": float(c["longitude"]) if c.get("longitude") else None,
        }
    if page >= info["pages"]:
        break
    page += 1
sys.stderr.write(f"real countries: {len(meta)}\n")

# 2) indicators
IND = {"t": "SP.DYN.LE00.IN", "m": "SP.DYN.LE00.MA.IN", "f": "SP.DYN.LE00.FE.IN"}
data = {k: {} for k in IND}  # data[k][iso3][year] = value
for k, ind in IND.items():
    d = get(f"https://api.worldbank.org/v2/country/all/indicator/{ind}?format=json&per_page=30000&date={Y0}:{Y1}")
    rows = d[1] or []
    for r in rows:
        iso3 = r.get("countryiso3code")
        if iso3 not in meta:
            continue
        v = r.get("value")
        if v is None:
            continue
        yr = int(r["date"])
        v = round(float(v), 1)
        # Despike modern artifacts: no country has legitimately fallen below ~35
        # since 2011 (Haiti's 2010 quake dip recovered). This nulls erratic
        # conflict-state modeling errors (e.g. CAR 2022=18.8) while PRESERVING
        # every real historical catastrophe (Rwanda 1994, Cambodia 1975–79, etc.).
        if yr >= 2011 and v < 35:
            continue
        data[k].setdefault(iso3, {})[yr] = v
    sys.stderr.write(f"{k}: {len(data[k])} countries with data\n")

YEARS = list(range(Y0, Y1 + 1))
out = []
for iso3, m in meta.items():
    t = data["t"].get(iso3, {})
    if not t:
        continue  # no life-expectancy data at all
    def arr(series):
        return [series.get(y) for y in YEARS]
    ta, ma, fa = arr(t), arr(data["m"].get(iso3, {})), arr(data["f"].get(iso3, {}))

    def headline(a):
        """Robust 'recent typical' value: most recent valid year that sits within
        12 yrs of the median of the last decade of valid values (drops outliers)."""
        valid = [(YEARS[i], a[i]) for i in range(len(a)) if a[i] is not None]
        if not valid:
            return None, None
        recent = valid[-10:]
        vals = sorted(v for _, v in recent)
        med = vals[len(vals) // 2]
        inband = [(y, v) for y, v in recent if abs(v - med) <= 12] or recent
        return inband[-1][1], inband[-1][0]

    latest, latyear = headline(ta)
    lm, _ = headline(ma)
    lf, _ = headline(fa)
    out.append({
        "iso": iso3, "name": m["name"], "region": m["region"], "income": m["income"],
        "lat": m["lat"], "lon": m["lon"],
        "le": latest, "m": lm, "f": lf, "yr": latyear,
        "t": ta, "ma": ma, "fa": fa,
    })

# --- Taiwan patch: the World Bank does not publish Taiwan. Supplement it from
# well-documented national statistics (DGBAS), interpolated across anchor years.
def interp(anchors):
    """anchors: {year: value} -> full array aligned to YEARS (linear between anchors)."""
    ys = sorted(anchors)
    out_a = []
    for y in YEARS:
        if y <= ys[0]:
            out_a.append(None if y < ys[0] - 0 else anchors[ys[0]]); continue
        if y >= ys[-1]:
            out_a.append(anchors[ys[-1]]); continue
        lo = max(a for a in ys if a <= y); hi = min(a for a in ys if a >= y)
        out_a.append(anchors[lo] if lo == hi else round(anchors[lo] + (anchors[hi] - anchors[lo]) * (y - lo) / (hi - lo), 1))
    return out_a
twn_t = interp({1960:63.0,1970:69.0,1980:72.0,1990:74.0,2000:76.5,2010:79.2,2015:80.2,2019:80.9,2020:81.3,2021:80.9,2022:79.8})
twn_m = interp({1960:60.0,1980:69.0,2000:73.8,2010:76.1,2020:78.1,2022:76.6})
twn_f = interp({1960:66.0,1980:74.5,2000:79.6,2010:82.6,2020:84.7,2022:83.3})
out.append({"iso":"TWN","name":"Taiwan","region":"East Asia & Pacific","income":"High income",
            "lat":23.7,"lon":121.0,"le":79.8,"m":76.6,"f":83.3,"yr":2022,
            "t":twn_t,"ma":twn_m,"fa":twn_f,"note":"Supplemented from Taiwan DGBAS (not in World Bank data)"})

out.sort(key=lambda r: (r["le"] is not None, r["le"]), reverse=True)

# compact JSON: drop nulls-as-None -> null; keep arrays
def compact(o):
    return json.dumps(o, separators=(",", ":"), ensure_ascii=False)

with open(OUT, "w", encoding="utf-8") as fp:
    fp.write("/* World life-expectancy data — sourced live from the World Bank Open Data API\n")
    fp.write("   (SP.DYN.LE00.IN / .MA.IN / .FE.IN), 1960–2022. Built by build_longevity.py.\n")
    fp.write("   t = total, ma = male, fa = female; arrays aligned to LE_YEARS. null = no data. */\n")
    fp.write("window.LE_YEARS = " + compact(YEARS) + ";\n")
    fp.write("window.LONGEVITY = [\n")
    for r in out:
        fp.write(compact(r) + ",\n")
    fp.write("];\n")

# summary to stderr
sys.stderr.write(f"\nEMITTED {len(out)} countries to {OUT}\n")
sys.stderr.write("TOP 12:\n")
for r in out[:12]:
    sys.stderr.write(f"  {r['iso']} {r['name']:<22} {r['le']} (M {r['m']} / F {r['f']}) @{r['yr']}\n")
sys.stderr.write("BOTTOM 8:\n")
for r in [x for x in out if x['le'] is not None][-8:]:
    sys.stderr.write(f"  {r['iso']} {r['name']:<22} {r['le']} (M {r['m']} / F {r['f']}) @{r['yr']}\n")
# note key microstates / special cases
for want in ["MCO","SMR","HKG","MAC","TWN","SGP","CHE","KOR","AUS","ITA","ESP","CAF"]:
    r = next((x for x in out if x['iso']==want), None)
    sys.stderr.write(f"  check {want}: {'MISSING' if not r else str(r['le'])+' M'+str(r['m'])+' F'+str(r['f'])}\n")
