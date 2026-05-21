import { geoIdentity, geoMercator, geoPath } from "d3-geo";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const NIGERIA_STATES_GEOJSON = "/gadm41_NGA_1.json";

type GeoFeature = {
  type: "Feature";
  properties?: Record<string, unknown>;
  geometry: { coordinates?: unknown };
};

type FeatureCollection = {
  type: "FeatureCollection";
  features: GeoFeature[];
};

type Pole = "north" | "south" | "east" | "west";

type MapFeatureRender = {
  idx: number;
  d: string;
  stateName: string;
  centroid: [number, number];
};

function findFirstCoordinate(value: unknown): [number, number] | null {
  if (!Array.isArray(value)) return null;
  if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
    return [value[0], value[1]];
  }
  for (const item of value) {
    const nested = findFirstCoordinate(item);
    if (nested) return nested;
  }
  return null;
}

function getStateName(feature: GeoFeature): string {
  const name = feature.properties?.NAME_1;
  return typeof name === "string" && name.length > 0 ? name : "Unknown";
}

type NigeriaMapBackgroundProps = {
  variant?: "light" | "dark";
  className?: string;
  viewBox?: string;
  mapOpacity?: number;
  showStateLabels?: boolean;
  /** Keep pole states (N/S/E/W) highlighted with always-on labels. */
  showStandbyPoles?: boolean;
};

const variantStyles = {
  light: {
    fill: "rgba(0, 107, 63, 0.07)",
    hoverFill: "rgba(0, 107, 63, 0.18)",
    standbyFill: "rgba(0, 107, 63, 0.16)",
    stroke: "rgba(0, 107, 63, 0.28)",
    hoverStroke: "rgba(0, 107, 63, 0.55)",
    standbyStroke: "rgba(0, 107, 63, 0.62)",
    strokeWidth: 0.9,
    standbyStrokeWidth: 1.2,
    layerOpacity: 1,
    showGrid: true,
    gridColor: "rgba(0, 107, 63, 0.08)",
    radial: "radial-gradient(circle at 72% 42%, rgba(0, 107, 63, 0.12), transparent 45%)",
    tooltipBg: "rgba(255, 255, 255, 0.96)",
    tooltipText: "#0b3a32",
    tooltipBorder: "rgba(0, 107, 63, 0.35)",
    labelBg: "rgba(255, 255, 255, 0.94)",
    labelText: "#0b3a32",
    labelBorder: "rgba(0, 107, 63, 0.4)",
  },
  dark: {
    fill: "rgba(52, 211, 153, 0.06)",
    hoverFill: "rgba(52, 211, 153, 0.2)",
    standbyFill: "rgba(52, 211, 153, 0.17)",
    stroke: "rgba(110, 231, 183, 0.35)",
    hoverStroke: "rgba(110, 231, 183, 0.75)",
    standbyStroke: "rgba(110, 231, 183, 0.82)",
    strokeWidth: 0.8,
    standbyStrokeWidth: 1.15,
    layerOpacity: 0.14,
    showGrid: false,
    gridColor: "transparent",
    radial: "radial-gradient(circle at 78% 45%, rgba(16, 136, 113, 0.33), transparent 38%)",
    tooltipBg: "rgba(7, 26, 31, 0.94)",
    tooltipText: "#ebfffa",
    tooltipBorder: "rgba(110, 231, 183, 0.45)",
    labelBg: "rgba(7, 26, 31, 0.92)",
    labelText: "#ebfffa",
    labelBorder: "rgba(110, 231, 183, 0.55)",
  },
} as const;

const POLE_LABEL_OFFSET: Record<Pole, { dx: number; dy: number }> = {
  north: { dx: 0, dy: 14 },
  south: { dx: 0, dy: -14 },
  west: { dx: -16, dy: 0 },
  east: { dx: 16, dy: 0 },
};

function StandbyStateLabel({
  centroid,
  name,
  pole,
  styles,
}: {
  centroid: [number, number];
  name: string;
  pole: Pole;
  styles: (typeof variantStyles)[keyof typeof variantStyles];
}) {
  const [x, y] = centroid;
  const { dx, dy } = POLE_LABEL_OFFSET[pole];
  const labelWidth = Math.max(72, name.length * 7.2);

  return (
    <g className="pointer-events-none" transform={`translate(${x + dx}, ${y + dy})`}>
      <rect
        x={-labelWidth / 2}
        y={-11}
        width={labelWidth}
        height={22}
        rx={4}
        fill={styles.labelBg}
        stroke={styles.labelBorder}
        strokeWidth={1}
      />
      <text
        textAnchor="middle"
        dominantBaseline="middle"
        fill={styles.labelText}
        fontSize={11}
        fontWeight={600}
        letterSpacing="0.08em"
        style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}
      >
        {name.toUpperCase()}
      </text>
    </g>
  );
}

function computePoleIndices(rendered: MapFeatureRender[]) {
  let north = 0;
  let south = 0;
  let west = 0;
  let east = 0;
  let minY = Infinity;
  let maxY = -Infinity;
  let minX = Infinity;
  let maxX = -Infinity;

  rendered.forEach(({ idx, centroid }) => {
    const [x, y] = centroid;
    if (y < minY) {
      minY = y;
      north = idx;
    }
    if (y > maxY) {
      maxY = y;
      south = idx;
    }
    if (x < minX) {
      minX = x;
      west = idx;
    }
    if (x > maxX) {
      maxX = x;
      east = idx;
    }
  });

  return { north, south, west, east };
}

export function NigeriaMapBackground({
  variant = "light",
  className = "",
  viewBox = "0 0 1500 820",
  mapOpacity,
  showStateLabels = true,
  showStandbyPoles = true,
}: NigeriaMapBackgroundProps) {
  const [features, setFeatures] = useState<GeoFeature[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const pendingPointerRef = useRef<{ x: number; y: number; name: string } | null>(null);
  const styles = variantStyles[variant];

  const pathBuilder = useMemo(() => {
    const firstCoord = features.length > 0 ? findFirstCoordinate(features[0]?.geometry?.coordinates) : null;
    const looksProjected =
      firstCoord !== null && (Math.abs(firstCoord[0]) > 180 || Math.abs(firstCoord[1]) > 90);
    const projection = looksProjected ? geoIdentity().reflectY(true) : geoMercator();
    if (features.length > 0) {
      projection.fitSize([1500, 820], {
        type: "FeatureCollection",
        features,
      } as never);
    }
    return geoPath(projection);
  }, [features]);

  const renderedFeatures = useMemo(() => {
    const items: MapFeatureRender[] = [];
    features.forEach((feature, idx) => {
      const d = pathBuilder(feature as never);
      if (!d) return;
      items.push({
        idx,
        d,
        stateName: getStateName(feature),
        centroid: pathBuilder.centroid(feature as never) as [number, number],
      });
    });
    return items;
  }, [features, pathBuilder]);

  const poleIndices = useMemo(() => {
    if (!showStandbyPoles || renderedFeatures.length === 0) {
      return { north: -1, south: -1, west: -1, east: -1 };
    }
    return computePoleIndices(renderedFeatures);
  }, [renderedFeatures, showStandbyPoles]);

  const standbyIndexSet = useMemo(() => {
    const indices = [poleIndices.north, poleIndices.south, poleIndices.west, poleIndices.east].filter(
      (idx) => idx >= 0,
    );
    return new Set(indices);
  }, [poleIndices]);

  const standbyLabels = useMemo(() => {
    if (!showStandbyPoles) return [];
    const byIdx = new Map(renderedFeatures.map((item) => [item.idx, item]));
    const entries: { pole: Pole; idx: number }[] = [
      { pole: "north", idx: poleIndices.north },
      { pole: "south", idx: poleIndices.south },
      { pole: "west", idx: poleIndices.west },
      { pole: "east", idx: poleIndices.east },
    ];
    const seen = new Set<number>();
    return entries.flatMap(({ pole, idx }) => {
      if (idx < 0 || seen.has(idx)) return [];
      seen.add(idx);
      const item = byIdx.get(idx);
      if (!item) return [];
      return [{ pole, item }];
    });
  }, [showStandbyPoles, poleIndices, renderedFeatures]);

  useEffect(() => {
    let mounted = true;
    async function loadMap() {
      try {
        const res = await fetch(NIGERIA_STATES_GEOJSON);
        if (!res.ok) return;
        const data = (await res.json()) as FeatureCollection;
        if (mounted) setFeatures(Array.isArray(data.features) ? data.features : []);
      } catch {
        // Decorative layer only.
      }
    }
    loadMap();
    return () => {
      mounted = false;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const flushTooltip = useCallback(() => {
    rafRef.current = null;
    const pending = pendingPointerRef.current;
    const el = tooltipRef.current;
    if (!pending || !el) return;
    el.style.display = "block";
    el.style.left = `${pending.x}px`;
    el.style.top = `${pending.y - 10}px`;
    el.textContent = pending.name;
  }, []);

  const moveTooltip = useCallback(
    (clientX: number, clientY: number, name: string) => {
      pendingPointerRef.current = { x: clientX, y: clientY, name };
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(flushTooltip);
    },
    [flushTooltip],
  );

  const hideTooltip = useCallback(() => {
    pendingPointerRef.current = null;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const el = tooltipRef.current;
    if (el) el.style.display = "none";
  }, []);

  const clearHover = useCallback(() => {
    setHoveredIndex(null);
    hideTooltip();
  }, [hideTooltip]);

  const nameByIndex = useMemo(() => {
    const map = new Map<number, string>();
    renderedFeatures.forEach(({ idx, stateName }) => map.set(idx, stateName));
    return map;
  }, [renderedFeatures]);

  const handleSvgPointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      const target = event.target;
      if (!(target instanceof SVGPathElement) || !target.dataset.idx) return;
      const idx = Number(target.dataset.idx);
      if (Number.isNaN(idx)) return;
      const stateName = nameByIndex.get(idx);
      if (!stateName) return;
      setHoveredIndex((prev) => (prev === idx ? prev : idx));
      moveTooltip(event.clientX, event.clientY, stateName);
    },
    [moveTooltip, nameByIndex],
  );

  return (
    <div className={`absolute inset-0 ${className}`}>
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {styles.showGrid ? (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(${styles.gridColor} 1px, transparent 1px), linear-gradient(90deg, ${styles.gridColor} 1px, transparent 1px)`,
              backgroundSize: "56px 56px",
            }}
          />
        ) : null}
        <div className="absolute inset-0" style={{ background: styles.radial }} />
      </div>

      <div
        className="absolute inset-0"
        style={{ opacity: mapOpacity ?? styles.layerOpacity }}
      >
        <svg
          viewBox={viewBox}
          className="h-full w-full"
          preserveAspectRatio="xMidYMid slice"
          role={showStateLabels ? "img" : undefined}
          aria-label={showStateLabels ? "Map of Nigeria states" : undefined}
          onPointerMove={showStateLabels ? handleSvgPointerMove : undefined}
          onPointerLeave={showStateLabels ? clearHover : undefined}
        >
          {renderedFeatures.map(({ idx, d }) => {
            const isHovered = hoveredIndex === idx;
            const isStandby = standbyIndexSet.has(idx);
            const isActive = isHovered || isStandby;

            const fill = isActive
              ? isHovered
                ? styles.hoverFill
                : styles.standbyFill
              : styles.fill;
            const stroke = isActive
              ? isHovered
                ? styles.hoverStroke
                : styles.standbyStroke
              : styles.stroke;
            const strokeWidth =
              isStandby && !isHovered ? styles.standbyStrokeWidth : isHovered ? styles.strokeWidth + 0.4 : styles.strokeWidth;

            return (
              <path
                key={`nigeria-map-${idx}`}
                data-idx={idx}
                d={d}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                className={showStateLabels ? "cursor-pointer" : undefined}
              />
            );
          })}

          {showStandbyPoles
            ? standbyLabels.map(({ pole, item }) => (
                <StandbyStateLabel
                  key={`standby-label-${pole}-${item.idx}`}
                  centroid={item.centroid}
                  name={item.stateName}
                  pole={pole}
                  styles={styles}
                />
              ))
            : null}
        </svg>
      </div>

      {showStateLabels ? (
        <div
          ref={tooltipRef}
          className="pointer-events-none fixed z-[100] hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded px-2.5 py-1 font-mono text-[11px] font-semibold tracking-[0.08em] uppercase shadow-md"
          style={{
            color: styles.tooltipText,
            backgroundColor: styles.tooltipBg,
            border: `1px solid ${styles.tooltipBorder}`,
          }}
        />
      ) : null}
    </div>
  );
}
