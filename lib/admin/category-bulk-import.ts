import { createClient } from "@/lib/supabase/client";
import type { AdminCategoryDefinition } from "@/lib/admin/kpi-management";

type ProfileRoleRow = {
  role: string | null;
  is_active: boolean | null;
};

type CategoryImportSourceRow = Record<string, unknown>;

export type CategoryBulkPreviewRow = {
  rowNumber: number;
  key: string;
  name: string;
  shortName: string;
  color: string;
  weight: number | null;
  sortOrder: number;
  isActive: boolean;
  errors: string[];
};

export type CategoryBulkCommitResult = {
  imported: number;
  weightRows: number;
  skipped: number;
  warnings: string[];
};

export type CategoryWeightEntry = {
  categoryKey: string;
  weight: number;
};

const COLUMN_ALIASES = {
  key: [
    "key",
    "anahtar",
    "kategori_key",
    "category_key",
    "slug",
    "kod",
    "code",
  ],
  name: ["ad", "name", "kategori", "category", "kategori_adi", "category_name"],
  shortName: ["kisa_ad", "kısa_ad", "short_name", "shortname", "kisa", "kısa"],
  color: ["renk", "color", "hex", "kategori_renk"],
  weight: ["agirlik", "ağırlık", "weight", "yuzde", "yüzde", "oran"],
  sortOrder: [
    "sira",
    "sıra",
    "sort_order",
    "sortorder",
    "sirama",
    "sıralama",
    "order",
  ],
  isActive: ["aktif", "is_active", "isactive", "durum", "active"],
} as const;

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/(^_|_$)/g, "");
}

function slugify(value: string) {
  return normalizeHeader(value)
    .replace(/_/g, "-")
    .replace(/(^-|-$)/g, "");
}

function stringValue(value: unknown, fallback = "") {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return fallback;
}

function numberValue(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.trim().replace("%", "").replace(",", ".");
    if (normalized && Number.isFinite(Number(normalized)))
      return Number(normalized);
  }
  return null;
}

function booleanValue(value: unknown, fallback = true) {
  if (typeof value === "boolean") return value;
  const raw = stringValue(value).toLocaleLowerCase("tr-TR");
  if (!raw) return fallback;
  if (["true", "1", "evet", "aktif", "active", "yes", "y"].includes(raw))
    return true;
  if (
    ["false", "0", "hayir", "hayır", "pasif", "inactive", "no", "n"].includes(
      raw,
    )
  )
    return false;
  return fallback;
}

function valueFor(row: CategoryImportSourceRow, aliases: readonly string[]) {
  const normalized = new Map<string, unknown>();
  Object.entries(row).forEach(([key, value]) =>
    normalized.set(normalizeHeader(key), value),
  );
  for (const alias of aliases) {
    const value = normalized.get(normalizeHeader(alias));
    if (value !== undefined && value !== null && stringValue(value) !== "")
      return value;
  }
  return undefined;
}

function isValidHexColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function normalizeColor(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "#64748b";
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  return isValidHexColor(withHash) ? withHash.toLowerCase() : withHash;
}

function parsePreviewRows(
  rows: CategoryImportSourceRow[],
): CategoryBulkPreviewRow[] {
  const seenKeys = new Set<string>();

  return rows.map((row, index) => {
    const name = stringValue(valueFor(row, COLUMN_ALIASES.name));
    const rawKey = stringValue(valueFor(row, COLUMN_ALIASES.key));
    const key = rawKey ? slugify(rawKey) : slugify(name);
    const shortName = stringValue(
      valueFor(row, COLUMN_ALIASES.shortName),
      name,
    );
    const color = normalizeColor(
      stringValue(valueFor(row, COLUMN_ALIASES.color), "#64748b"),
    );
    const weight = numberValue(valueFor(row, COLUMN_ALIASES.weight));
    const sortOrder =
      numberValue(valueFor(row, COLUMN_ALIASES.sortOrder)) ?? index + 1;
    const isActive = booleanValue(valueFor(row, COLUMN_ALIASES.isActive), true);
    const errors: string[] = [];

    if (!key) errors.push("Kategori anahtarı veya ad zorunlu.");
    if (!name) errors.push("Kategori adı zorunlu.");
    if (!isValidHexColor(color)) errors.push("Renk #RRGGBB formatında olmalı.");
    if (!Number.isInteger(sortOrder) || sortOrder <= 0)
      errors.push("Sıra pozitif tam sayı olmalı.");
    if (weight !== null && (weight < 0 || weight > 100))
      errors.push("Ağırlık 0-100 arasında olmalı.");
    if (key && seenKeys.has(key))
      errors.push(`Dosyada yinelenen kategori anahtarı: ${key}`);
    if (key) seenKeys.add(key);

    return {
      rowNumber: index + 2,
      key,
      name,
      shortName,
      color,
      weight,
      sortOrder,
      isActive,
      errors,
    };
  });
}

export async function parseCategoryBulkImportFile(
  file: File,
): Promise<CategoryBulkPreviewRow[]> {
  const lowerName = file.name.toLocaleLowerCase("tr-TR");
  if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".xls")) {
    throw new Error(
      "Kategori toplu ekleme için .xlsx veya .xls dosyası seçin.",
    );
  }

  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName)
    throw new Error("Excel dosyasında çalışma sayfası bulunamadı.");

  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<CategoryImportSourceRow>(worksheet, {
    defval: "",
  });
  if (!rows.length)
    throw new Error("Excel dosyasında içe aktarılacak satır bulunamadı.");

  return parsePreviewRows(rows);
}

async function assertCurrentUserIsSuperadmin() {
  const supabase = createClient();
  const { data: userResponse, error: userError } =
    await supabase.auth.getUser();
  if (userError) throw new Error(userError.message);

  const userId = userResponse.user?.id;
  if (!userId)
    throw new Error("Bu işlem için giriş yapılmış kullanıcı bulunamadı.");

  const { data, error } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", userId)
    .single();

  if (error) throw new Error(error.message);

  const profile = data as unknown as ProfileRoleRow;
  if (profile.role !== "superadmin" || profile.is_active === false) {
    throw new Error(
      "Bu işlem sadece aktif superadmin kullanıcılar tarafından yapılabilir.",
    );
  }
}

async function getActiveMethodologyVersionId() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("kpi_methodology_versions")
    .select("id")
    .eq("is_active", true)
    .limit(1);

  if (error) return null;
  const row = Array.isArray(data)
    ? (data[0] as { id?: unknown } | undefined)
    : undefined;
  return typeof row?.id === "string" ? row.id : null;
}

export async function loadActiveCategoryWeights(): Promise<
  CategoryWeightEntry[]
> {
  const supabase = createClient();
  const activeVersionId = await getActiveMethodologyVersionId();
  if (!activeVersionId) return [];

  const { data, error } = await supabase
    .from("kpi_category_weights")
    .select("category_key, weight")
    .eq("methodology_version_id", activeVersionId);

  if (error || !Array.isArray(data)) return [];
  return data
    .map((row) => {
      const record = row as { category_key?: unknown; weight?: unknown };
      return {
        categoryKey: stringValue(record.category_key),
        weight: numberValue(record.weight) ?? 0,
      };
    })
    .filter((item) => Boolean(item.categoryKey));
}

export async function commitCategoryBulkImport(
  previewRows: CategoryBulkPreviewRow[],
): Promise<CategoryBulkCommitResult> {
  await assertCurrentUserIsSuperadmin();

  const validRows = previewRows.filter((row) => row.errors.length === 0);
  if (!validRows.length)
    throw new Error("İçe aktarılacak geçerli kategori satırı yok.");

  const supabase = createClient();
  const categoryRows = validRows.map((row) => ({
    key: row.key,
    name: row.name,
    short_name: row.shortName,
    color: row.color,
    sort_order: row.sortOrder,
    is_active: row.isActive,
  }));

  const { error } = await supabase
    .from("kpi_categories")
    .upsert(categoryRows, { onConflict: "key" });

  if (error) throw new Error(error.message);

  const activeVersionId = await getActiveMethodologyVersionId();
  const weightedRows = validRows.filter((row) => row.weight !== null);
  const warnings: string[] = [];
  let weightRows = 0;

  if (weightedRows.length > 0) {
    if (!activeVersionId) {
      warnings.push(
        "Aktif metodoloji versiyonu bulunamadı; kategori ağırlıkları yazılmadı, yalnızca kategori tanımları kaydedildi.",
      );
    } else {
      const { error: weightError } = await supabase
        .from("kpi_category_weights")
        .upsert(
          weightedRows.map((row) => ({
            methodology_version_id: activeVersionId,
            category_key: row.key,
            weight: row.weight ?? 0,
          })),
          { onConflict: "methodology_version_id,category_key" },
        );

      if (weightError) throw new Error(weightError.message);
      weightRows = weightedRows.length;
    }
  }

  await supabase.from("audit_logs").insert({
    action: "bulk_import",
    entity: "kpi_category",
    entity_id: "bulk",
    summary: `${validRows.length} kategori Excel ile içe aktarıldı`,
    metadata: {
      rows: validRows.map((row) => ({
        key: row.key,
        name: row.name,
        color: row.color,
        weight: row.weight,
        sortOrder: row.sortOrder,
        isActive: row.isActive,
      })),
      weightRows,
      skipped: previewRows.length - validRows.length,
      warnings,
    },
  });

  return {
    imported: validRows.length,
    weightRows,
    skipped: previewRows.length - validRows.length,
    warnings,
  };
}

export async function exportCategoryDefinitionsToExcel(
  categories: AdminCategoryDefinition[],
  weights: Map<string, number>,
) {
  await assertCurrentUserIsSuperadmin();

  const XLSX = await import("xlsx");
  const rows = categories.map((category) => ({
    key: category.key,
    ad: category.name,
    kisa_ad: category.shortName,
    renk: category.color,
    agirlik: weights.get(category.key) ?? "",
    sira: category.sortOrder,
    aktif: category.isActive ? "evet" : "hayır",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Kategoriler");
  const buffer = XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
  }) as ArrayBuffer;
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export async function buildCategoryImportTemplate() {
  const XLSX = await import("xlsx");
  const worksheet = XLSX.utils.json_to_sheet([
    {
      key: "musteri",
      ad: "Müşteri",
      kisa_ad: "Müşteri",
      renk: "#2563eb",
      agirlik: 25,
      sira: 1,
      aktif: "evet",
    },
    {
      key: "ticari",
      ad: "Ticari",
      kisa_ad: "Ticari",
      renk: "#16a34a",
      agirlik: 25,
      sira: 2,
      aktif: "evet",
    },
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Kategoriler");
  const buffer = XLSX.write(workbook, {
    type: "array",
    bookType: "xlsx",
  }) as ArrayBuffer;
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
