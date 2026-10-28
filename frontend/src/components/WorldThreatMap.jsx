import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Line,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import { getGeoIntelApi } from "../services/api";

const WORLD_MAP =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const SOC_LOCATION = [78.9629, 20.5937];

function getAttackIp(attack) {
  return (
    attack?.source_ip ||
    attack?.attacker_ip ||
    attack?.src_ip ||
    attack?.ip_address ||
    attack?.ip ||
    ""
  );
}

function normalizeGeo(response, ip) {
  const candidate =
    response?.data ||
    response?.location ||
    response?.geo ||
    response?.geolocation ||
    response;

  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const latitude = Number(
    candidate.latitude ??
      candidate.lat ??
      candidate.location?.latitude ??
      candidate.location?.lat
  );

  const longitude = Number(
    candidate.longitude ??
      candidate.lon ??
      candidate.lng ??
      candidate.location?.longitude ??
      candidate.location?.lon ??
      candidate.location?.lng
  );

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    ip,
    latitude,
    longitude,
    country:
      candidate.country ||
      candidate.country_name ||
      candidate.location?.country ||
      candidate.location?.country_name ||
      "Unknown",
    city:
      candidate.city ||
      candidate.location?.city ||
      "",
    severity: candidate.severity || "high",
  };
}

function severityColor(severity) {
  const value = String(severity || "").toLowerCase();

  if (value === "critical") return "#ff355d";
  if (value === "high") return "#ff6b35";
  if (value === "medium") return "#ffc857";

  return "#22d3ee";
}

export default function WorldThreatMap({
  attacks = [],
  title = "Global Threat Map (Live)",
  compact = false,
}) {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [timeRange, setTimeRange] = useState("Live");
  const [position, setPosition] = useState({
    coordinates: [10, 20],
    zoom: 1,
  });

  const attackerIps = useMemo(() => {
    return [
      ...new Set(
        attacks
          .map(getAttackIp)
          .filter(Boolean)
      ),
    ].slice(0, 25);
  }, [attacks]);

  useEffect(() => {
    let active = true;

    async function loadLocations() {
      if (!attackerIps.length) {
        setLocations([]);
        return;
      }

      setLoading(true);

      const results = await Promise.all(
        attackerIps.map(async (ip) => {
          try {
            const response = await getGeoIntelApi(ip);
            return normalizeGeo(response, ip);
          } catch {
            return null;
          }
        })
      );

      if (active) {
        setLocations(results.filter(Boolean));
        setLoading(false);
      }
    }

    loadLocations();

    return () => {
      active = false;
    };
  }, [attackerIps]);

  const mapHeight = compact ? "h-[360px]" : "h-[500px]";

  function handleZoomIn() {
    setPosition((current) => ({
      ...current,
      zoom: Math.min(current.zoom * 1.4, 4),
    }));
  }

  function handleZoomOut() {
    setPosition((current) => ({
      ...current,
      zoom: Math.max(current.zoom / 1.4, 1),
    }));
  }

  function handleReset() {
    setPosition({
      coordinates: [10, 20],
      zoom: 1,
    });
  }

  return (
    <section className="overflow-hidden rounded-xl border border-cyan-900/80 bg-[#020d1b]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-900/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg text-cyan-300">⌖</span>

          <h2 className="text-base font-semibold text-white">
            {title}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {["Live", "24h", "7d", "30d"].map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={`rounded-md px-3 py-1.5 text-xs ${
                timeRange === range
                  ? "bg-cyan-500 font-semibold text-slate-950"
                  : "bg-slate-900 text-slate-400 hover:text-white"
              }`}
            >
              {range}
            </button>
          ))}

          <span className="ml-2 flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-1.5 text-xs text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Live
          </span>
        </div>
      </div>

      <div className={`relative overflow-hidden ${mapHeight}`}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 145,
            center: [10, 18],
          }}
          width={1000}
          height={500}
          className="h-full w-full bg-[#020d1b]"
        >
          <ZoomableGroup
            zoom={position.zoom}
            center={position.coordinates}
            onMoveEnd={setPosition}
            minZoom={1}
            maxZoom={4}
          >
            <Geographies geography={WORLD_MAP}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="#06233a"
                    stroke="#0b5b85"
                    strokeWidth={0.45}
                    style={{
                      default: {
                        outline: "none",
                      },
                      hover: {
                        fill: "#0a3450",
                        outline: "none",
                      },
                      pressed: {
                        fill: "#0a3450",
                        outline: "none",
                      },
                    }}
                  />
                ))
              }
            </Geographies>

            {locations.map((location) => (
              <Line
                key={`line-${location.ip}`}
                from={[
                  location.longitude,
                  location.latitude,
                ]}
                to={SOC_LOCATION}
                stroke={severityColor(location.severity)}
                strokeWidth={1.1}
                strokeLinecap="round"
                opacity={0.75}
              />
            ))}

            {locations.map((location) => (
              <Marker
                key={`marker-${location.ip}`}
                coordinates={[
                  location.longitude,
                  location.latitude,
                ]}
              >
                <circle
                  r={7}
                  fill={severityColor(location.severity)}
                  stroke="#ffb3c1"
                  strokeWidth={1}
                  opacity={0.95}
                />

                <circle
                  r={13}
                  fill="none"
                  stroke={severityColor(location.severity)}
                  strokeWidth={1}
                  opacity={0.5}
                />

                <title>
                  {location.ip} -{" "}
                  {location.country}
                </title>
              </Marker>
            ))}

            <Marker coordinates={SOC_LOCATION}>
              <circle
                r={11}
                fill="#42f5b3"
                stroke="#d1fae5"
                strokeWidth={1.5}
              />

              <circle
                r={18}
                fill="none"
                stroke="#42f5b3"
                strokeWidth={1}
                opacity={0.65}
              />

              <text
                textAnchor="middle"
                y={30}
                style={{
                  fill: "#6ee7b7",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                Your Location
              </text>

              <text
                textAnchor="middle"
                y={44}
                style={{
                  fill: "#a7f3d0",
                  fontSize: 10,
                }}
              >
                India
              </text>
            </Marker>
          </ZoomableGroup>
        </ComposableMap>

        <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-md border border-cyan-800 bg-[#031426]/90">
          <button
            type="button"
            onClick={handleZoomIn}
            className="px-3 py-2 text-lg text-slate-200 hover:bg-cyan-900/60"
            aria-label="Zoom in"
          >
            +
          </button>

          <button
            type="button"
            onClick={handleZoomOut}
            className="border-t border-cyan-800 px-3 py-2 text-lg text-slate-200 hover:bg-cyan-900/60"
            aria-label="Zoom out"
          >
            −
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="border-t border-cyan-800 px-3 py-2 text-sm text-cyan-300 hover:bg-cyan-900/60"
            aria-label="Reset map"
          >
            ◎
          </button>
        </div>

        <div className="absolute bottom-3 left-3 rounded-md border border-cyan-900 bg-[#031426]/90 px-3 py-2 text-xs text-slate-400">
          {loading
            ? "Loading geolocation..."
            : `${locations.length} active locations`}
        </div>

        {!locations.length && !loading && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="rounded-lg border border-cyan-900 bg-[#020d1b]/80 px-4 py-3 text-center">
              <p className="text-sm text-slate-300">
                No geolocation data available
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Generate a simulated threat to populate the map.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}