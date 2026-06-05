"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import Topbar from "@/components/layout/Topbar";
import { createClient } from "@/lib/supabase/client";
import {
  type AdminCategoryDefinition,
  type AdminKpiDefinition,
  buildAuditDraft,
  deleteKpi,
  getFallbackCategories,
  getFallbackKpis,
  isPersistedId,
  loadAdminKpiConfig,
  saveKpi,
  setKpiActive,
  validateKpiDraft,
  writeAuditLog,
} from "@/lib/admin/kpi-management";
import styles from "@/components/admin/KpiManagement.module.css";
import {
  currentUserIsSuperadmin,
  exportKpiDefinitionsToExcel,
  parseKpiBulkImportFile,
  upsertKpiDefinitionsFromPreview,
  type KpiBulkImportPreview,
} from "@/lib/admin/kpi-bulk-import";

const emptyKpi: AdminKpiDefinition = {
  id: "draft",
  kpiNo: 13,
  name: "",
  shortName: "",
  description: "",
  categoryKey: "",
  isActive: true,
  direction: "higher_is_better",
  dataType: "index",
  coverageRule: "included",
  source: "fallback",
};

function getNextKpiNo(kpis: AdminKpiDefinition[]) {
  return Math.max(0, ...kpis.map((kpi) => kpi.kpiNo)) + 1;
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

export default function KpiSettingsAdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const [kpis, setKpis] = useState<AdminKpiDefinition[]>(getFallbackKpis());
  const [categories, setCategories] = useState<AdminCategoryDefinition[]>(
    getFallbackCategories(),
  );
  const [source, setSource] = useState<"supabase" | "fallback">("fallback");
  const [warning, setWarning] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AdminKpiDefinition>({
    ...emptyKpi,
    kpiNo: getNextKpiNo(getFallbackKpis()),
  });
  const [auditNote, setAuditNote] = useState("");
  const [dbError, setDbError] = useState("");
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<KpiBulkImportPreview | null>(null);
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkError, setBulkError] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadAdminKpiConfig(supabase).then((config) => {
      if (cancelled) return;
      setKpis(config.kpis);
      setCategories(config.categories);
      setSource(config.source);
      setWarning(config.warning ?? "");
      setDraft((prev) => ({
        ...prev,
        kpiNo: getNextKpiNo(config.kpis),
        categoryKey: config.categories[0]?.key ?? "",
      }));
    });
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    currentUserIsSuperadmin().then((allowed) => {
      if (!cancelled) setIsSuperadmin(allowed);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const categoryNameByKey = useMemo(() => {
    return new Map(categories.map((category) => [category.key, category.name]));
  }, [categories]);

  const validationErrors = useMemo(
    () => validateKpiDraft(draft, kpis, selectedId ?? undefined),
    [draft, kpis, selectedId],
  );

  function resetForm() {
    setSelectedId(null);
    setDraft({
      ...emptyKpi,
      id: "draft",
      kpiNo: getNextKpiNo(kpis),
      categoryKey: categories[0]?.key ?? "",
    });
    setAuditNote("");
    setDbError("");
  }

  function editKpi(kpi: AdminKpiDefinition) {
    setSelectedId(kpi.id);
    setDraft({ ...kpi });
    setAuditNote("");
    setDbError("");
  }

  function upsertLocal(saved: AdminKpiDefinition) {
    setKpis((current) => {
      const exists = current.some((item) => item.id === saved.id);
      const next = exists
        ? current.map((item) => (item.id === saved.id ? saved : item))
        : [...current, saved];
      return next.sort((a, b) => a.kpiNo - b.kpiNo);
    });
  }

  async function saveDraft() {
    const errors = validateKpiDraft(draft, kpis, selectedId ?? undefined);
    if (errors.length) return;
    setDbError("");

    const action = selectedId ? "update" : "create";

    if (source === "supabase") {
      setSaving(true);
      const editing =
        Boolean(selectedId) && isPersistedId(selectedId as string);
      const { data, error } = await saveKpi(supabase, draft, editing);
      setSaving(false);
      if (error || !data) {
        setDbError(error ?? "KPI kaydedilemedi.");
        return;
      }
      upsertLocal(data);
      setSelectedId(data.id);
      setDraft({ ...data });
      await writeAuditLog(
        supabase,
        buildAuditDraft("kpi_definition", data.id, action, {
          kpiNo: data.kpiNo,
          name: data.name,
          categoryKey: data.categoryKey,
          isActive: data.isActive,
        }),
      );
      setAuditNote(
        `KPI ${data.kpiNo} ${action === "create" ? "eklendi" : "güncellendi"} · Supabase'e yazıldı.`,
      );
      return;
    }

    // Fallback: DB kapalı/okunamıyor → sadece ekran state'i güncellenir.
    const entityId = selectedId ?? `local-kpi-${draft.kpiNo}-${Date.now()}`;
    const nextDraft: AdminKpiDefinition = {
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

  async function toggleActive(kpi: AdminKpiDefinition) {
    const nextActive = !kpi.isActive;
    setDbError("");

    if (source === "supabase" && isPersistedId(kpi.id)) {
      setSaving(true);
      const { data, error } = await setKpiActive(supabase, kpi.id, nextActive);
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
          "kpi_definition",
          data.id,
          nextActive ? "reactivate" : "deactivate",
          {
            kpiNo: data.kpiNo,
            isActive: data.isActive,
          },
        ),
      );
      setAuditNote(
        `KPI ${data.kpiNo} ${nextActive ? "aktifleştirildi" : "pasifleştirildi"} · Supabase'e yazıldı.`,
      );
      return;
    }

    const next = { ...kpi, isActive: nextActive };
    setKpis((current) =>
      current.map((item) => (item.id === kpi.id ? next : item)),
    );
    setDraft((current) => (current.id === kpi.id ? next : current));
    setAuditNote("Fallback modunda: ekran güncellendi, DB yazımı yapılmadı.");
  }

  async function removeKpi(kpi: AdminKpiDefinition) {
    if (
      !confirmPermanentDelete(
        `KPI ${kpi.kpiNo}`,
        "Bu KPI geçmiş raporlar, kategori ortalamaları ve metodoloji karşılaştırmalarında referans alınmış olabilir. Emin değilseniz önce Pasifleştir seçeneğini kullanın.",
      )
    )
      return;
    setDbError("");
    if (source === "supabase" && isPersistedId(kpi.id)) {
      setSaving(true);
      const { error } = await deleteKpi(supabase, kpi.id);
      setSaving(false);
      if (error) {
        setDbError(error);
        return;
      }
      await writeAuditLog(
        supabase,
        buildAuditDraft("kpi_definition", kpi.id, "delete", {
          kpiNo: kpi.kpiNo,
          name: kpi.name,
          permanentDelete: true,
        }),
      );
    }
    setKpis((current) => current.filter((item) => item.id !== kpi.id));
    if (selectedId === kpi.id) resetForm();
    setAuditNote(`KPI ${kpi.kpiNo} kalıcı olarak silindi.`);
  }

  async function handleBulkFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setBulkMessage("");
    setBulkError("");
    setBulkPreview(null);
    if (!file) return;

    setBulkBusy(true);
    try {
      const preview = await parseKpiBulkImportFile(file, categories, kpis);
      setBulkPreview(preview);
      setBulkMessage(
        `${preview.fileName}: ${preview.validRows} geçerli, ${preview.errorRows} hatalı satır bulundu.`,
      );
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : "Excel dosyası okunamadı.");
    } finally {
      setBulkBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function commitBulkImport() {
    if (!bulkPreview) return;
    setBulkBusy(true);
    setBulkError("");
    setBulkMessage("");
    try {
      const saved = await upsertKpiDefinitionsFromPreview(bulkPreview);
      setKpis((current) => {
        const byNo = new Map(current.map((kpi) => [kpi.kpiNo, kpi]));
        saved.forEach((kpi) => byNo.set(kpi.kpiNo, kpi));
        return Array.from(byNo.values()).sort((a, b) => a.kpiNo - b.kpiNo);
      });
      setBulkMessage(`${saved.length} KPI Supabase'e yazıldı/güncellendi.`);
      setBulkPreview(null);
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : "Toplu KPI import başarısız oldu.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function downloadKpiExport() {
    setBulkBusy(true);
    setBulkError("");
    setBulkMessage("");
    try {
      const file = await exportKpiDefinitionsToExcel();
      const byteCharacters = atob(file.content);
      const bytes = new Uint8Array(byteCharacters.length);
      for (let index = 0; index < byteCharacters.length; index += 1) {
        bytes[index] = byteCharacters.charCodeAt(index);
      }
      const blob = new Blob([bytes], { type: file.mimeType });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setBulkMessage(`${file.rowCount} KPI tanımı Excel olarak indirildi.`);
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : "KPI export başarısız oldu.");
    } finally {
      setBulkBusy(false);
    }
  }

  const activeCount = kpis.filter((kpi) => kpi.isActive).length;
  const lowerBetterCount = kpis.filter(
    (kpi) => kpi.direction === "lower_is_better",
  ).length;
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase("tr-TR");
  const filteredKpis = useMemo(() => {
    if (!normalizedSearch) return kpis;
    return kpis.filter((kpi) => {
      const haystack = [
        String(kpi.kpiNo),
        `kpi ${kpi.kpiNo}`,
        kpi.name,
        kpi.shortName,
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");
      return haystack.includes(normalizedSearch);
    });
  }, [kpis, normalizedSearch]);

  return (
    <div className={styles.shell}>
      <Topbar
        title="KPI Ayarları"
        subtitle="Super Admin KPI tanımı, kategori bağlantısı, aktif/pasif ve coverage yönetimi"
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

          <section className={`${styles.card} ${styles.formCard}`}>
            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                saveDraft();
              }}
            >
              <div className={styles.formHeader}>
                <div>
                  <h2 className={styles.formTitle}>
                    {selectedId ? "KPI Düzenle" : "Yeni KPI Ekle"}
                  </h2>
                </div>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={resetForm}
                >
                  Yeni KPI
                </button>
              </div>

              {validationErrors.length > 0 && (
                <div className={styles.errors}>
                  {validationErrors.map((error) => (
                    <div key={error}>{error}</div>
                  ))}
                </div>
              )}
              {dbError && <div className={styles.errors}>{dbError}</div>}

              <div className={styles.formGrid}>
                <div className={styles.twoCols}>
                  <div className={styles.field}>
                    <label>KPI no</label>
                    <input
                      className={styles.input}
                      type="number"
                      min={1}
                      value={draft.kpiNo}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          kpiNo: Number(event.target.value),
                        })
                      }
                    />
                  </div>
                  <div className={styles.field}>
                    <label>Kısa ad</label>
                    <input
                      className={styles.input}
                      value={draft.shortName}
                      onChange={(event) =>
                        setDraft({ ...draft, shortName: event.target.value })
                      }
                      placeholder="KPI 13"
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Ad</label>
                  <input
                    className={styles.input}
                    value={draft.name}
                    onChange={(event) =>
                      setDraft({ ...draft, name: event.target.value })
                    }
                    placeholder="KPI adı"
                  />
                </div>

                <div className={styles.field}>
                  <label>Kategori</label>
                  <select
                    className={styles.select}
                    value={draft.categoryKey}
                    onChange={(event) =>
                      setDraft({ ...draft, categoryKey: event.target.value })
                    }
                  >
                    <option value="">Kategori seç</option>
                    {categories
                      .filter((category) => category.isActive)
                      .map((category) => (
                        <option key={category.key} value={category.key}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div className={styles.twoCols}>
                  <div className={styles.field}>
                    <label>Hesap yönü</label>
                    <select
                      className={styles.select}
                      value={draft.direction}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          direction:
                            event.target.value === "lower_is_better"
                              ? "lower_is_better"
                              : "higher_is_better",
                        })
                      }
                    >
                      <option value="higher_is_better">Yüksek daha iyi</option>
                      <option value="lower_is_better">Düşük daha iyi</option>
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label>Veri tipi</label>
                    <select
                      className={styles.select}
                      value={draft.dataType}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          dataType: event.target
                            .value as AdminKpiDefinition["dataType"],
                        })
                      }
                    >
                      <option value="index">Endeks</option>
                      <option value="ratio">Rasyo</option>
                      <option value="percentage">Yüzde</option>
                      <option value="currency">Tutar</option>
                      <option value="duration">Süre</option>
                      <option value="count">Adet</option>
                    </select>
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Coverage kuralı</label>
                  <select
                    className={styles.select}
                    value={draft.coverageRule}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        coverageRule: event.target
                          .value as AdminKpiDefinition["coverageRule"],
                      })
                    }
                  >
                    <option value="included">Coverage dahil</option>
                    <option value="excluded_zero_variance">
                      Zero-variance nedeniyle coverage dışı
                    </option>
                    <option value="optional">Opsiyonel</option>
                    <option value="required">Zorunlu</option>
                  </select>
                </div>

                <label className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={(event) =>
                      setDraft({ ...draft, isActive: event.target.checked })
                    }
                  />
                  Aktif KPI
                </label>

                <div className={`${styles.field} ${styles.descriptionField}`}>
                  <label>Açıklama</label>
                  <textarea
                    className={styles.textarea}
                    value={draft.description}
                    onChange={(event) =>
                      setDraft({ ...draft, description: event.target.value })
                    }
                    placeholder="KPI metodoloji açıklaması"
                  />
                </div>
              </div>

              <div className={styles.formFooter}>
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
              </div>
            </form>
          </section>

          <section className={`${styles.card} ${styles.bulkCard}`}>
            <div className={styles.toolbar}>
              <div>
                <h2 className={styles.toolbarTitle}>Excel ile Toplu KPI</h2>
                <div className={styles.toolbarHint}>
                  Kolonlar: kpi_no, ad, kısa ad, kategori, yön, aktif.</div>
              </div>
              <div className={styles.actions}>
                <input
                  ref={fileInputRef}
                  className={styles.hiddenFileInput}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleBulkFileChange}
                />
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={bulkBusy}
                >
                  Excel Seç
                </button>
                {isSuperadmin && (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={downloadKpiExport}
                    disabled={bulkBusy}
                  >
                    Excel Export
                  </button>
                )}
              </div>
            </div>

            {!isSuperadmin && (
              <div className={styles.inlineNotice}>
                Excel export ve commit işlemleri yalnızca aktif super-admin kullanıcıya açıktır.
              </div>
            )}
            {bulkError && <div className={styles.errors}>{bulkError}</div>}
            {bulkMessage && <div className={styles.successBox}>{bulkMessage}</div>}

            {bulkPreview && (
              <div className={styles.bulkPreview}>
                <div className={styles.bulkSummary}>
                  <strong>{bulkPreview.totalRows}</strong> satır · <strong>{bulkPreview.validRows}</strong> geçerli · <strong>{bulkPreview.errorRows}</strong> hatalı
                </div>
                {bulkPreview.issues.length > 0 && (
                  <div className={styles.issueList}>
                    {bulkPreview.issues.slice(0, 12).map((issue, index) => (
                      <div key={`${issue.rowNumber}-${issue.message}-${index}`} className={issue.severity === "error" ? styles.issueError : styles.issueWarning}>
                        Satır {issue.rowNumber}: {issue.message}
                      </div>
                    ))}
                    {bulkPreview.issues.length > 12 && (
                      <div className={styles.formHint}>+{bulkPreview.issues.length - 12} ek uyarı/hata daha var.</div>
                    )}
                  </div>
                )}
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Satır</th>
                        <th>No</th>
                        <th>Ad</th>
                        <th>Kısa ad</th>
                        <th>Kategori</th>
                        <th>Yön</th>
                        <th>Aktif</th>
                        <th>Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkPreview.rows.slice(0, 10).map((row) => (
                        <tr key={row.rowNumber}>
                          <td>{row.rowNumber}</td>
                          <td>KPI {row.kpi.kpiNo || "—"}</td>
                          <td>{row.kpi.name || "—"}</td>
                          <td>{row.kpi.shortName || "—"}</td>
                          <td>{categoryNameByKey.get(row.kpi.categoryKey) ?? row.kpi.categoryKey}</td>
                          <td>{row.kpi.direction === "lower_is_better" ? "Düşük daha iyi" : "Yüksek daha iyi"}</td>
                          <td>{row.kpi.isActive ? "Aktif" : "Pasif"}</td>
                          <td>
                            <span className={`${styles.status} ${row.status === "valid" ? styles.statusActive : styles.statusPassive}`}>
                              {row.status === "valid" ? "Geçerli" : "Hatalı"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className={styles.formFooter}>
                  <div className={styles.formHint}>Önizlemede ilk 10 satır gösterilir. Commit yalnızca geçerli satırları yazar.</div>
                  <button
                    type="button"
                    className={styles.button}
                    onClick={commitBulkImport}
                    disabled={bulkBusy || bulkPreview.validRows === 0}
                  >
                    Geçerli Satırları İçe Aktar
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className={styles.card}>
            <div className={styles.toolbar}>
              <div>
                <h2 className={styles.toolbarTitle}>KPI Listesi</h2>
                <div className={styles.toolbarHint}>
                  {filteredKpis.length}/{kpis.length} KPI · {activeCount} aktif
                  · {lowerBetterCount} düşük daha iyi
                </div>
              </div>
              <div className={styles.searchBox}>
                <label htmlFor="kpiSearch">Liste ara</label>
                <input
                  id="kpiSearch"
                  className={styles.searchInput}
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Ad, kısa ad veya KPI no"
                />
              </div>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>KPI</th>
                    <th>Kategori</th>
                    <th>Yön</th>
                    <th>Coverage</th>
                    <th>Durum</th>
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKpis.map((kpi) => (
                    <tr key={kpi.id}>
                      <td>
                        <strong>KPI {kpi.kpiNo}</strong>
                      </td>
                      <td>
                        <div className={styles.kpiNameLine}>
                          <span>{kpi.name}</span>
                          <span className={styles.shortName}>
                            {kpi.shortName}
                          </span>
                          <span className={styles.sourceBadge}>
                            {kpi.source}
                          </span>
                        </div>
                      </td>
                      <td>
                        {categoryNameByKey.get(kpi.categoryKey) ??
                          kpi.categoryKey}
                      </td>
                      <td>
                        {kpi.direction === "lower_is_better"
                          ? "Düşük daha iyi"
                          : "Yüksek daha iyi"}
                      </td>
                      <td>{kpi.coverageRule}</td>
                      <td>
                        <span
                          className={`${styles.status} ${kpi.isActive ? styles.statusActive : styles.statusPassive}`}
                        >
                          {kpi.isActive ? "Aktif" : "Pasif"}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => editKpi(kpi)}
                          >
                            Düzenle
                          </button>
                          <button
                            type="button"
                            className={styles.dangerButton}
                            onClick={() => toggleActive(kpi)}
                            disabled={saving}
                          >
                            {kpi.isActive ? "Pasifleştir" : "Aktifleştir"}
                          </button>
                          <button
                            type="button"
                            className={styles.dangerButton}
                            onClick={() => removeKpi(kpi)}
                            disabled={saving}
                            title="Kalıcı sil"
                          >
                            Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredKpis.length === 0 && (
                    <tr>
                      <td colSpan={7} className={styles.emptyCell}>
                        Arama kriterine uygun KPI bulunamadı.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
