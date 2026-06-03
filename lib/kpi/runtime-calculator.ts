import { KAT_YAPILAR, KPI_META, type SegmentScore } from "./config";
import type { CubeRow } from "./data";
import type { KpiRuntimeData } from "./data-source-types";

export type RuntimeReferenceMode = "same-filter" | "national";

export interface RuntimeSegmentScoreRow {
  seg: string;
  baz: SegmentScore | null;
  cmp: SegmentScore | null;
}

export interface RuntimeCalculator {
  rows: CubeRow[];
  getKpisFromCube: (
    seg?: string,
    bolge?: string,
    yas?: string,
    donem?: string,
  ) => (number | null)[];
  getN: (seg?: string, bolge?: string, yas?: string, donem?: string) => number;
  getScore: (
    seg?: string,
    bolge?: string,
    yas?: string,
    donem?: string,
  ) => SegmentScore | null;
  getRegionalScore: (
    seg?: string,
    bolge?: string,
    yas?: string,
    donem?: string,
  ) => SegmentScore | null;
  getKpiScores: (
    seg?: string,
    bolge?: string,
    yas?: string,
    donem?: string,
  ) => number[];
  getRegionalKpiScores: (
    seg?: string,
    bolge?: string,
    yas?: string,
    donem?: string,
  ) => number[];
  getKpiScoresFullDetail: (
    seg?: string,
    bolge?: string,
    yas?: string,
    donem?: string,
    referenceMode?: RuntimeReferenceMode,
  ) => RuntimeKpiScoreDetail[];
  getAvailableDonemler: (
    seg?: string,
    bolge?: string,
    yas?: string,
  ) => Set<string>;
  getSegmentScores: (
    segments: string[],
    bolge?: string,
    yas?: string,
    donem?: string,
    cmpDonem?: string,
  ) => RuntimeSegmentScoreRow[];
}

export interface RuntimeKpiScoreDetail {
  kpiIdx: number;
  kpiNo: number;
  score: number;
  rawValue: number | null;
  referenceValue: number | null;
  isMissing: boolean;
  isReferenceMissing: boolean;
  isLowerBetter: boolean;
  isCapped: boolean;
  coverageIncluded: boolean;
}

export function createRuntimeCalculator(
  runtime: KpiRuntimeData | CubeRow[],
): RuntimeCalculator {
  const rows = Array.isArray(runtime) ? runtime : runtime.cubeRows;
  const cubeMap = new Map(
    rows.map((row) => [cubeKey(row[0], row[1], row[2], row[3]), row]),
  );
  const zeroVarianceIndexes = buildZeroVarianceIndexes(rows);

  const getKpisFromCube = (
    seg = "",
    bolge = "",
    yas = "Tümü",
    donem = "",
  ): (number | null)[] => {
    const row = cubeMap.get(cubeKey(seg, bolge, yas, donem));
    return row ? row[4] : KPI_META.map(() => null);
  };

  const getN = (seg = "", bolge = "", yas = "Tümü", donem = ""): number => {
    const row = cubeMap.get(cubeKey(seg, bolge, yas, donem));
    return row ? row[5] : 0;
  };

  const referenceKpis = (
    seg = "",
    bolge = "",
    yas = "Tümü",
    donem = "",
    referenceMode: RuntimeReferenceMode = "same-filter",
  ): (number | null)[] => {
    if (referenceMode === "national")
      return getKpisFromCube(seg || "", "", yas, donem);
    return getKpisFromCube("", bolge, yas, donem);
  };

  const getScoreWithMode = (
    seg = "",
    bolge = "",
    yas = "Tümü",
    donem = "",
    referenceMode: RuntimeReferenceMode = "same-filter",
  ): SegmentScore | null => {
    const kpis = getKpisFromCube(seg, bolge, yas, donem);
    if (kpis.every((value) => value == null)) return null;
    return calculateScoreFromKpis(
      kpis,
      referenceKpis(seg, bolge, yas, donem, referenceMode),
      zeroVarianceIndexes,
    );
  };

  const getKpiScoresWithMode = (
    seg = "",
    bolge = "",
    yas = "Tümü",
    donem = "",
    referenceMode: RuntimeReferenceMode = "same-filter",
  ): number[] => {
    const kpis = getKpisFromCube(seg, bolge, yas, donem);
    const refKpis = referenceKpis(seg, bolge, yas, donem, referenceMode);
    return kpis.map((value, index) => {
      const normalized = normalizeRaw(
        value,
        refKpis[index],
        index,
        zeroVarianceIndexes,
      );
      return Number.isFinite(normalized.score) ? normalized.score : 100;
    });
  };

  const getKpiScoresFullDetail = (
    seg = "",
    bolge = "",
    yas = "Tümü",
    donem = "",
    referenceMode: RuntimeReferenceMode = "same-filter",
  ): RuntimeKpiScoreDetail[] => {
    const kpis = getKpisFromCube(seg, bolge, yas, donem);
    const refKpis = referenceKpis(seg, bolge, yas, donem, referenceMode);

    return kpis.map((value, index) => {
      const meta = KPI_META[index];
      const normalized = normalizeRaw(
        value,
        refKpis[index],
        index,
        zeroVarianceIndexes,
      );
      return {
        kpiIdx: index,
        kpiNo: meta?.no ?? index + 1,
        score: Number.isFinite(normalized.score) ? normalized.score : 100,
        rawValue: value ?? null,
        referenceValue: refKpis[index] ?? null,
        isMissing: value == null,
        isReferenceMissing: refKpis[index] == null,
        isLowerBetter: meta?.is_lower_better ?? false,
        isCapped: false,
        coverageIncluded: normalized.coverageIncluded,
      };
    });
  };

  const getAvailableDonemler = (
    seg = "",
    bolge = "",
    yas = "Tümü",
  ): Set<string> => {
    const periods = new Set<string>();
    for (const row of rows) {
      if (row[0] === seg && row[1] === bolge && row[2] === yas && row[3])
        periods.add(row[3]);
    }
    return periods;
  };

  return {
    rows,
    getKpisFromCube,
    getN,
    getScore: (seg = "", bolge = "", yas = "Tümü", donem = "") =>
      getScoreWithMode(seg, bolge, yas, donem, "same-filter"),
    getRegionalScore: (seg = "", bolge = "", yas = "Tümü", donem = "") =>
      getScoreWithMode(seg, bolge, yas, donem, "national"),
    getKpiScores: (seg = "", bolge = "", yas = "Tümü", donem = "") =>
      getKpiScoresWithMode(seg, bolge, yas, donem, "same-filter"),
    getRegionalKpiScores: (seg = "", bolge = "", yas = "Tümü", donem = "") =>
      getKpiScoresWithMode(seg, bolge, yas, donem, "national"),
    getKpiScoresFullDetail,
    getAvailableDonemler,
    getSegmentScores: (
      segments,
      bolge = "",
      yas = "Tümü",
      donem = "",
      cmpDonem = "",
    ) =>
      segments.map((seg) => ({
        seg,
        baz: getScoreWithMode(seg, bolge, yas, donem, "same-filter"),
        cmp: cmpDonem
          ? getScoreWithMode(seg, bolge, yas, cmpDonem, "same-filter")
          : null,
      })),
  };
}

function cubeKey(seg = "", bolge = "", yas = "Tümü", donem = ""): string {
  return `${seg}|${bolge}|${yas}|${donem ?? ""}`;
}

function buildZeroVarianceIndexes(rows: CubeRow[]): Set<number> {
  const excluded = new Set<number>();

  for (let i = 0; i < KPI_META.length; i++) {
    const values = rows
      .map((row) => row[4]?.[i])
      .filter(
        (value): value is number =>
          typeof value === "number" && Number.isFinite(value),
      );

    if (values.length === 0) continue;
    const uniqueValues = new Set(values.map((value) => Number(value)));
    if (uniqueValues.size <= 1) excluded.add(i);
  }

  return excluded;
}

function calculateScoreFromKpis(
  kpis: (number | null)[],
  refKpis: (number | null)[],
  zeroVarianceIndexes: Set<number>,
): SegmentScore {
  let genel = 0;
  const categoryScores: Record<string, number> = {};

  for (const category of KAT_YAPILAR) {
    let total = 0;
    let validCount = 0;

    for (const kpiIdx of category.kpis) {
      const normalized = normalizeRaw(
        kpis[kpiIdx],
        refKpis[kpiIdx],
        kpiIdx,
        zeroVarianceIndexes,
      );
      if (normalized.coverageIncluded && Number.isFinite(normalized.score)) {
        total += normalized.score;
        validCount++;
      }
    }

    const categoryScore = validCount > 0 ? Math.round(total / validCount) : 100;
    categoryScores[category.key] = categoryScore;
    genel += categoryScore * category.agirlik;
  }

  return {
    genel: Math.round(genel),
    musteri: categoryScores.musteri ?? 0,
    ticari: categoryScores.ticari ?? 0,
    operasyonel: categoryScores.operasyonel ?? 0,
    bayi: categoryScores.bayi ?? 0,
    kapsam: categoryScores.kapsam ?? 0,
  };
}

function normalizeRaw(
  value: number | null | undefined,
  reference: number | null | undefined,
  kpiIdx: number,
  zeroVarianceIndexes: Set<number>,
): { score: number; coverageIncluded: boolean } {
  if (zeroVarianceIndexes.has(kpiIdx))
    return { score: NaN, coverageIncluded: false };
  if (value == null || reference == null)
    return { score: NaN, coverageIncluded: false };

  if (value === 0 && reference === 0)
    return { score: 100, coverageIncluded: true };

  const lowerIsBetter = KPI_META[kpiIdx]?.is_lower_better ?? false;

  if (reference === 0) {
    return {
      score: lowerIsBetter ? (value === 0 ? 100 : 0) : 0,
      coverageIncluded: true,
    };
  }

  if (value === 0) {
    return { score: lowerIsBetter ? 100 : 0, coverageIncluded: true };
  }

  const ratio = lowerIsBetter ? reference / value : value / reference;
  return { score: Math.round(clampScore(ratio * 100)), coverageIncluded: true };
}

function clampScore(value: number): number {
  return Math.min(200, Math.max(0, value));
}
