"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import { useAuth } from "@/context/AuthContext";
import { createClient } from "@/lib/supabase/client";
import {
  type AdminCategoryDefinition,
  type AdminKpiDefinition,
  buildAuditDraft,
  deleteCategory,
  getFallbackCategories,
  getFallbackKpis,
  isPersistedId,
  loadAdminKpiConfig,
  saveCategory,
  setCategoryActive,
  validateCategoryDraft,
  writeAuditLog,
} from "@/lib/admin/kpi-management";
import {
  buildCategoryImportTemplate,
  commitCategoryBulkImport,
  exportCategoryDefinitionsToExcel,
  loadActiveCategoryWeights,
  parseCategoryBulkImportFile,
  type CategoryBulkPreviewRow,
} from "@/lib/admin/category-bulk-import";
import styles from "@/components/admin/KpiManagement.module.css";

const emptyCategory: AdminCategoryDefinition = {
  id: "draft",
  key: "",
  name: "",
  shortName: "",
  description: "",
  color: "#64748b",
  sortOrder: 1,
  isActive: true,
  source: "fallback",
};

function slugify(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getNextSortOrder(categories: AdminCategoryDefinition[]) {
  return Math.max(0, ...categories.map((category) => category.sortOrder)) + 1;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function sumWeights(weights: Map<string, number>) {
  return (
    Math.round(
      Array.from(weights.values()).reduce((sum, value) => sum + value, 0) * 100,
    ) / 100
  );
}

function confirmPermanentDelete(label: string, warning: string) {
  if (typeof window === "undefined") return false;

  const firstConfirm = window.confirm(
    `${label} kalıcı olarak silinecek. Bu işlem geri alınamaz.\n\n${warning}\n\nDevam edilsin mi?`,
  );
  if (!firstConfirm) return false;

  const typed = window.prompt(
    "Kalıcı silmeyi onaylamak için büyük harflerle SIL yazın.",
  );
  return typed === "SIL";
}

export default function CategoriesAdminPage() {
  const { isSuperAdmin } = useAuth();
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [categories, setCategories] = useState<AdminCategoryDefinition[]>(
    getFallbackCategories(),
  );
  const [kpis, setKpis] = useState<AdminKpiDefinition[]>(getFallbackKpis());
  const [source, setSource] = useState<"supabase" | "fallback">("fallback");
  const [warning, setWarning] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminCategoryDefinition>({
    ...emptyCategory,
    sortOrder: getNextSortOrder(getFallbackCategories()),
  });
  const [auditNote, setAuditNote] = useState("");
  const [dbError, setDbError] = useState("");
  const [saving, setSaving] = useState(false);
  const [categoryWeights, setCategoryWeights] = useState<Map<string, number>>(
    new Map(),
  );
  const [importRows, setImportRows] = useState<CategoryBulkPreviewRow[]>([]);
  const [importFileName, setImportFileName] = useState("");
  const [importError, setImportError] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [config, weights] = await Promise.all([
        loadAdminKpiConfig(supabase),
        loadActiveCategoryWeights(),
      ]);
      if (cancelled) return;
      setCategories(config.categories);
      setKpis(config.kpis);
      setSource(config.source);
      setWarning(config.warning ?? "");
      setCategoryWeights(
        new Map(weights.map((item) => [item.categoryKey, item.weight])),
      );
      setDraft((prev) => ({
        ...prev,
        sortOrder: getNextSortOrder(config.categories),
      }));
    }

    load().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const kpiCountByCategory = useMemo(() => {
    const counts = new Map<string, number>();
    kpis.forEach((kpi) =>
      counts.set(kpi.categoryKey, (counts.get(kpi.categoryKey) ?? 0) + 1),
    );
    return counts;
  }, [kpis]);

  const currentWeightTotal = useMemo(
    () => sumWeights(categoryWeights),
    [categoryWeights],
  );
  const previewWeightTotal = useMemo(() => {
    const previewWeights = new Map(categoryWeights);
    importRows.forEach((row) => {
      if (row.errors.length === 0 && row.weight !== null)
        previewWeights.set(row.key, row.weight);
    });
    return sumWeights(previewWeights);
  }, [categoryWeights, importRows]);
  const validImportRows = useMemo(
    () => importRows.filter((row) => row.errors.length === 0),
    [importRows],
  );
  const invalidImportRows = importRows.length - validImportRows.length;
  const currentWeightWarning =
    Math.abs(currentWeightTotal - 100) < 0.01
      ? ""
      : `Aktif ağırlık toplamı ${currentWeightTotal}/100. Bu uyarı importu engellemez.`;
  const previewWeightWarning =
    importRows.length === 0 || Math.abs(previewWeightTotal - 100) < 0.01
      ? ""
      : `Import sonrası ağırlık toplamı ${previewWeightTotal}/100 olacak. Uyarı amaçlıdır, geçerli satırlar yine yazılabilir.`;

  const validationErrors = useMemo(
    () => validateCategoryDraft(draft, categories, selectedId ?? undefined),
    [categories, draft, selectedId],
  );

  function resetForm() {
    setSelectedId(null);
    setDraft({ ...emptyCategory, sortOrder: getNextSortOrder(categories) });
    setAuditNote("");
    setDbError("");
  }

  function editCategory(category: AdminCategoryDefinition) {
    setSelectedId(category.id);
    setDraft({ ...category });
    setAuditNote("");
    setDbError("");
  }

  async function refreshConfigAfterImport() {
    const [config, weights] = await Promise.all([
      loadAdminKpiConfig(supabase),
      loadActiveCategoryWeights(),
    ]);
    setCategories(config.categories);
    setKpis(config.kpis);
    setSource(config.source);
    setWarning(config.warning ?? "");
    setCategoryWeights(
      new Map(weights.map((item) => [item.categoryKey, item.weight])),
    );
    setDraft((prev) => ({
      ...prev,
      sortOrder: getNextSortOrder(config.categories),
    }));
  }

  async function handleImportFile(file?: File | null) {
    if (!file) return;
    setImportError("");
    setImportMessage("");
    setImportFileName(file.name);
    try {
      const rows = await parseCategoryBulkImportFile(file);
      setImportRows(rows);
    } catch (error) {
      setImportRows([]);
      setImportError(
        error instanceof Error ? error.message : "Excel dosyası okunamadı.",
      );
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleCommitImport() {
    if (validImportRows.length === 0) return;
    setImporting(true);
    setImportError("");
    setImportMessage("");
    try {
      const result = await commitCategoryBulkImport(importRows);
      await refreshConfigAfterImport();
      setImportRows([]);
      setImportFileName("");
      setImportMessage(
        `${result.imported} kategori yazıldı · ${result.weightRows} ağırlık satırı güncellendi${result.skipped ? ` · ${result.skipped} satır atlandı` : ""}${result.warnings.length ? ` · ${result.warnings.join(" ")}` : ""}`,
      );
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Kategori import işlemi başarısız oldu.",
      );
    } finally {
      setImporting(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    setImportError("");
    try {
      const blob = await exportCategoryDefinitionsToExcel(
        categories,
        categoryWeights,
      );
      downloadBlob(
        blob,
        `kpi-kategorileri-${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Kategori export işlemi başarısız oldu.",
      );
    } finally {
      setExporting(false);
    }
  }

  async function handleTemplateDownload() {
    const blob = await buildCategoryImportTemplate();
    downloadBlob(blob, "kpi-kategori-import-sablonu.xlsx");
  }

  function updateName(name: string) {
    setDraft((current) => ({
      ...current,
      name,
      key: selectedId ? current.key : slugify(name),
      shortName: current.shortName || name,
    }));
  }

  function upsertLocal(saved: AdminCategoryDefinition) {
    setCategories((current) => {
      const exists = current.some((item) => item.id === saved.id);
      const next = exists
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [...current, saved];
      return next.sort((a, b) => a.sortOrder - b.sortOrder);
    });
  }

  async function saveDraft() {
    const errors = validateCategoryDraft(
      draft,
      categories,
      selectedId ?? undefined,
    );
    if (errors.length) return;
    setDbError("");

    const action = selectedId ? "update" : "create";

    if (source === "supabase") {
      setSaving(true);
      const editing =
        Boolean(selectedId) && isPersistedId(selectedId as string);
      const { data, error } = await saveCategory(supabase, draft, editing);
      setSaving(false);
      if (error || !data) {
        setDbError(error ?? "Kategori kaydedilemedi.");
        return;
      }
      upsertLocal(data);
      setSelectedId(data.id);
      setDraft({ ...data });
      await writeAuditLog(
        supabase,
        buildAuditDraft("kpi_category", data.id, action, {
          key: data.key,
          name: data.name,
          sortOrder: data.sortOrder,
          isActive: data.isActive,
        }),
      );
      setAuditNote(
        `${data.name} ${action === "create" ? "eklendi" : "güncellendi"} · Supabase'e yazıldı.`,
      );
      return;
    }

    const entityId = selectedId ?? `local-category-${draft.key}-${Date.now()}`;
    const nextDraft: AdminCategoryDefinition = {
      ...draft,
      id: entityId,
      source: "fallback",
    };
    upsertLocal(nextDraft);
    setSelectedId(entityId);
    setAuditNote(
      "Fallback modunda: ekran güncellendi, DB yazımı yapılmadı (tablolar okunamadı).",
    );
  }

  async function toggleActive(category: AdminCategoryDefinition) {
    const nextActive = !category.isActive;
    setDbError("");

    if (source === "supabase" && isPersistedId(category.id)) {
      setSaving(true);
      const { data, error } = await setCategoryActive(
        supabase,
        category.id,
        nextActive,
      );
      setSaving(false);
      if (error || !data) {
        setDbError(error ?? "Durum güncellenemedi.");
        return;
      }
      upsertLocal(data);
      setDraft((current) => (current.id === data.id ? data : current));
      await writeAuditLog(
        supabase,
        buildAuditDraft(
          "kpi_category",
          data.id,
          nextActive ? "reactivate" : "deactivate",
          {
            key: data.key,
            isActive: data.isActive,
          },
        ),
      );
      setAuditNote(
        `${data.name} ${nextActive ? "aktifleştirildi" : "pasifleştirildi"} · Supabase'e yazıldı.`,
      );
      return;
    }

    const next = { ...category, isActive: nextActive };
    setCategories((current) =>
      current.map((item) => (item.id === category.id ? next : item)),
    );
    setDraft((current) => (current.id === category.id ? next : current));
    setAuditNote("Fallback modunda: ekran güncellendi, DB yazımı yapılmadı.");
  }

  async function removeCategory(category: AdminCategoryDefinition) {
    if (
      !confirmPermanentDelete(
        `"${category.name}" kategorisi`,
        "Bu kategoriye bağlı KPI varsa Supabase silmeyi engelleyebilir. Dashboard ve geçmiş rapor bütünlüğü için emin değilseniz önce Pasifleştir seçeneğini kullanın.",
      )
    )
      return;
    setDbError("");
    if (source === "supabase" && isPersistedId(category.id)) {
      setSaving(true);
      const { error } = await deleteCategory(supabase, category.id);
      setSaving(false);
      if (error) {
        setDbError(error);
        return;
      }
      await writeAuditLog(
        supabase,
        buildAuditDraft("kpi_category", category.id, "delete", {
          key: category.key,
          name: category.name,
          permanentDelete: true,
        }),
      );
    }
    setCategories((current) =>
      current.filter((item) => item.id !== category.id),
    );
    if (selectedId === category.id) resetForm();
    setAuditNote(`"${category.name}" kategorisi kalıcı olarak silindi.`);
  }

  const activeCount = categories.filter((category) => category.isActive).length;

  return (
    <div className={styles.shell}>
      <Topbar
        title="Kategori Yönetimi"
        subtitle="Super Admin kategori adı, kısa adı, renk, ağırlık, sıralama ve aktif/pasif yönetimi"
        pills={[
          {
            label: source === "supabase" ? "Supabase" : "Fallback config",
            variant: source === "supabase" ? "green" : "amber",
          },
        ]}
      />
      <div className={styles.content}>
        <div className={styles.inner}>
          {warning && (
            <section className={styles.notice}>
              <div className={styles.noticeText}>{warning}</div>
            </section>
          )}

          <section className={styles.card}>
            <div className={styles.toolbar}>
              <div>
                <h2 className={styles.toolbarTitle}>
                  Excel ile Toplu Kategori
                </h2>
                <div className={styles.toolbarHint}>
                  Kolonlar: key, ad, renk, ağırlık · export super-admin.</div>
              </div>
              <div className={styles.actions}>
                <input
                  ref={fileInputRef}
                  className={styles.hiddenInput}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(event) =>
                    handleImportFile(event.target.files?.[0])
                  }
                />
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Excel seç
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleTemplateDownload}
                >
                  Şablon indir
                </button>
                {isSuperAdmin && (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={handleExport}
                    disabled={exporting}
                  >
                    {exporting ? "Hazırlanıyor…" : "Excel export"}
                  </button>
                )}
              </div>
            </div>
            <div className={styles.importBody}>
              {currentWeightWarning && (
                <div className={styles.warningBox}>{currentWeightWarning}</div>
              )}
              {previewWeightWarning && (
                <div className={styles.warningBox}>{previewWeightWarning}</div>
              )}
              {importError && (
                <div className={styles.errors}>{importError}</div>
              )}
              {importMessage && (
                <div className={styles.successBox}>{importMessage}</div>
              )}
              {importRows.length > 0 && (
                <div className={styles.importPreview}>
                  <div className={styles.previewHeader}>
                    <strong>{importFileName}</strong>
                    <span>
                      {validImportRows.length} geçerli · {invalidImportRows}{" "}
                      hatalı
                    </span>
                    <button
                      type="button"
                      className={styles.button}
                      onClick={handleCommitImport}
                      disabled={validImportRows.length === 0 || importing}
                    >
                      {importing ? "Yazılıyor…" : "Geçerli satırları yaz"}
                    </button>
                  </div>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Satır</th>
                          <th>Key</th>
                          <th>Ad</th>
                          <th>Renk</th>
                          <th>Ağırlık</th>
                          <th>Sıra</th>
                          <th>Durum</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.slice(0, 20).map((row) => (
                          <tr key={`${row.rowNumber}-${row.key}`}>
                            <td>{row.rowNumber}</td>
                            <td>{row.key}</td>
                            <td>
                              <div>{row.name}</div>
                              {row.errors.length > 0 && (
                                <div className={styles.rowError}>
                                  {row.errors.join(" · ")}
                                </div>
                              )}
                            </td>
                            <td>
                              <span
                                className={styles.colorDot}
                                style={{ background: row.color }}
                              />
                              {row.color}
                            </td>
                            <td>{row.weight ?? "—"}</td>
                            <td>{row.sortOrder}</td>
                            <td>{row.isActive ? "Aktif" : "Pasif"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {importRows.length > 20 && (
                    <div className={styles.formHint}>
                      Önizlemede ilk 20 satır gösteriliyor; commit tüm geçerli
                      satırları yazar.
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <div className={styles.grid}>
            <section className={styles.card}>
              <div className={styles.toolbar}>
                <div>
                  <h2 className={styles.toolbarTitle}>Kategori Listesi</h2>
                  <div className={styles.toolbarHint}>
                    {categories.length} kategori · {activeCount} aktif · ağırlık
                    toplamı {currentWeightTotal}/100
                  </div>
                </div>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={resetForm}
                  >
                    Yeni kategori
                  </button>
                </div>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Sıra</th>
                      <th>Kategori</th>
                      <th>Kısa ad</th>
                      <th>Renk</th>
                      <th>Ağırlık</th>
                      <th>KPI</th>
                      <th>Durum</th>
                      <th>İşlem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => (
                      <tr key={category.id}>
                        <td>
                          <strong>{category.sortOrder}</strong>
                        </td>
                        <td>
                          <div>{category.name}</div>
                          <div className={`${styles.muted} ${styles.small}`}>
                            {category.key} ·{" "}
                            <span className={styles.sourceBadge}>
                              {category.source}
                            </span>
                          </div>
                        </td>
                        <td>{category.shortName}</td>
                        <td>
                          <span
                            className={styles.colorDot}
                            style={{ background: category.color }}
                          />
                          {category.color}
                        </td>
                        <td>{categoryWeights.get(category.key) ?? "—"}</td>
                        <td>{kpiCountByCategory.get(category.key) ?? 0}</td>
                        <td>
                          <span
                            className={`${styles.status} ${category.isActive ? styles.statusActive : styles.statusPassive}`}
                          >
                            {category.isActive ? "Aktif" : "Pasif"}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actions}>
                            <button
                              type="button"
                              className={styles.secondaryButton}
                              onClick={() => editCategory(category)}
                            >
                              Düzenle
                            </button>
                            <button
                              type="button"
                              className={styles.dangerButton}
                              onClick={() => toggleActive(category)}
                              disabled={saving}
                            >
                              {category.isActive
                                ? "Pasifleştir"
                                : "Aktifleştir"}
                            </button>
                            <button
                              type="button"
                              className={styles.dangerButton}
                              onClick={() => removeCategory(category)}
                              disabled={saving}
                              title="Kalıcı sil"
                            >
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <aside className={styles.card}>
              <form
                className={styles.form}
                onSubmit={(event) => {
                  event.preventDefault();
                  saveDraft();
                }}
              >
                <div>
                  <h2 className={styles.formTitle}>
                    {selectedId ? "Kategori Düzenle" : "Yeni Kategori Ekle"}
                  </h2>
                </div>

                {validationErrors.length > 0 && (
                  <div className={styles.errors}>
                    {validationErrors.map((error) => (
                      <div key={error}>{error}</div>
                    ))}
                  </div>
                )}
                {dbError && <div className={styles.errors}>{dbError}</div>}

                <div className={styles.field}>
                  <label>Ad</label>
                  <input
                    className={styles.input}
                    value={draft.name}
                    onChange={(event) => updateName(event.target.value)}
                    placeholder="Kategori adı"
                  />
                </div>

                <div className={styles.twoCols}>
                  <div className={styles.field}>
                    <label>Kısa ad</label>
                    <input
                      className={styles.input}
                      value={draft.shortName}
                      onChange={(event) =>
                        setDraft({ ...draft, shortName: event.target.value })
                      }
                      placeholder="Kısa ad"
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Anahtar</label>
                    <input
                      className={styles.input}
                      value={draft.key}
                      onChange={(event) =>
                        setDraft({ ...draft, key: slugify(event.target.value) })
                      }
                      placeholder="kategori-key"
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Açıklama</label>
                  <textarea
                    className={styles.textarea}
                    value={draft.description}
                    onChange={(event) =>
                      setDraft({ ...draft, description: event.target.value })
                    }
                    placeholder="Kategori metodoloji açıklaması"
                  />
                </div>

                <div className={styles.twoCols}>
                  <div className={styles.field}>
                    <label>Renk</label>
                    <input
                      className={styles.input}
                      type="color"
                      value={draft.color}
                      onChange={(event) =>
                        setDraft({ ...draft, color: event.target.value })
                      }
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Sıralama</label>
                    <input
                      className={styles.input}
                      type="number"
                      min={1}
                      value={draft.sortOrder}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          sortOrder: Number(event.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={(event) =>
                      setDraft({ ...draft, isActive: event.target.checked })
                    }
                  />
                  Aktif kategori
                </label>

                <div className={styles.actions}>
                  <button
                    type="submit"
                    className={styles.button}
                    disabled={validationErrors.length > 0 || saving}
                  >
                    {saving
                      ? "Kaydediliyor…"
                      : selectedId
                        ? "Güncelle"
                        : "Ekle"}
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={resetForm}
                  >
                    Temizle
                  </button>
                </div>

                {auditNote && (
                  <div className={styles.formHint}>{auditNote}</div>
                )}
              </form>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
