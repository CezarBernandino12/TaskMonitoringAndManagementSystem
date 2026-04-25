const { useState, useEffect, useCallback } = React;

const headers = [
  "Specific Goals and Objectives",
  "Detailed Plan",
  "Specific Timeline",
  "Lead Personnel",
  "Metric For Success",
  "Remarks (Evaluation)",
];

const SILEO_IMPORT_URL = "https://esm.sh/sileo?deps=react@18.3.1,react-dom@18.3.1";
let sileoModulePromise = null;

function getSileoTitle(type) {
  if (type === "success") return "Success";
  if (type === "error") return "Action needed";
  if (type === "info") return "Information";
  return "Notice";
}

async function fireSileoToast(message, type = "success") {
  if (!sileoModulePromise) {
    sileoModulePromise = import(SILEO_IMPORT_URL);
  }

  const mod = await sileoModulePromise;
  const api = mod?.sileo;
  const notify = api?.[type] || api?.info || api?.success;

  if (typeof notify !== "function") {
    throw new Error("Sileo toast API is unavailable.");
  }

  notify({
    title: getSileoTitle(type),
    description: message,
  });
}

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@500;600;700;800;900&display=swap');

  *, *::before, *::after { box-sizing: border-box; }

  :root {
    --sp-bg: #f5f7fb;
    --sp-card: #ffffff;
    --sp-card-soft: #fafcff;
    --sp-muted-bg: #f7f9fc;
    --sp-border: #dfe6f1;
    --sp-border-strong: #cfd9e8;
    --sp-text: #1f2937;
    --sp-muted: #7b8799;
    --sp-subtle: #9eabbc;
    --sp-primary: #2f80ed;
    --sp-primary-soft: #e8f1ff;
    --sp-green: #21a55a;
    --sp-red: #e45874;
    --sp-red-soft: #fde8ed;
    --sp-shadow-soft: 0 10px 28px rgba(20, 32, 51, 0.05);
    --sp-shadow: 0 16px 34px rgba(20, 32, 51, 0.10);
  }

  [data-theme="dark"] {
    --sp-bg: #0e1624;
    --sp-card: #151f31;
    --sp-card-soft: #182338;
    --sp-muted-bg: #121b2b;
    --sp-border: rgba(255,255,255,0.08);
    --sp-border-strong: rgba(255,255,255,0.14);
    --sp-text: #f4f7fb;
    --sp-muted: #9badc2;
    --sp-subtle: #7f93ab;
    --sp-primary: #7ea5ff;
    --sp-primary-soft: rgba(126,165,255,0.16);
    --sp-green: #33c77a;
    --sp-red: #ff6b86;
    --sp-red-soft: rgba(255,107,134,0.13);
    --sp-shadow-soft: 0 10px 28px rgba(0,0,0,.25);
    --sp-shadow: 0 16px 34px rgba(0,0,0,.34);
  }

  body {
    font-family: "Nunito", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
    background: var(--sp-bg) !important;
    color: var(--sp-text) !important;
  }

  button, input, textarea, select { font-family: inherit !important; }

  #root {
    width: 100%;
    min-height: 100%;
    color: var(--sp-text);
    padding-bottom: 42px;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  @keyframes toastIn {
    from { opacity: 0; transform: translateY(10px) scale(.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .preview-shell {
    width: min(100%, 1280px) !important;
    margin: 22px auto 0 !important;
    padding: 0 14px !important;
  }

  .preview-grid {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) 320px !important;
    gap: 22px !important;
    align-items: start !important;
  }

  .preview-main-card,
  .preview-side-card,
  .loading-card {
    background: var(--sp-card) !important;
    border: 1px solid var(--sp-border) !important;
    border-radius: 24px !important;
    box-shadow: var(--sp-shadow-soft) !important;
  }

  .preview-main-card {
    overflow: hidden !important;
    animation: fadeUp .18s ease both !important;
  }

  .preview-side-card {
    position: sticky !important;
    top: 16px !important;
    overflow: hidden !important;
  }

  .preview-toolbar {
    padding: 20px 22px !important;
    border-bottom: 1px solid var(--sp-border) !important;
    background: var(--sp-card) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 16px !important;
  }

  .toolbar-left {
    display: flex !important;
    align-items: center !important;
    gap: 14px !important;
    min-width: 0 !important;
  }

  .toolbar-icon {
    width: 44px !important;
    height: 44px !important;
    min-width: 44px !important;
    border-radius: 14px !important;
    background: var(--sp-primary-soft) !important;
    color: var(--sp-primary) !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 18px !important;
  }

  .toolbar-title {
    margin: 0 !important;
    color: var(--sp-text) !important;
    font-size: 1.35rem !important;
    line-height: 1.15 !important;
    font-weight: 900 !important;
    letter-spacing: -0.03em !important;
  }

  .toolbar-subtitle {
    margin: 5px 0 0 !important;
    color: var(--sp-muted) !important;
    font-size: 12.5px !important;
    line-height: 1.45 !important;
    font-weight: 700 !important;
  }

  .toolbar-actions {
    display: flex !important;
    align-items: center !important;
    justify-content: flex-end !important;
    gap: 10px !important;
    flex-shrink: 0 !important;
  }

  .preview-paper-wrap {
    padding: 26px !important;
    overflow: auto !important;
    background:
      linear-gradient(135deg, rgba(47,128,237,.04), transparent 40%),
      #eef2f7 !important;
  }

  .document-page {
    width: 1123px !important;
    min-height: 794px !important;
    margin: 0 auto !important;
    background: #ffffff !important;
    color: #000000 !important;
    padding: 40px 50px !important;
    box-shadow: 0 10px 30px rgba(15,23,42,.18) !important;
    font-family: "Times New Roman", Times, serif !important;
    font-size: 13px !important;
    line-height: 1.25 !important;
  }

  .doc-letterhead {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 15px !important;
    margin-bottom: 6px !important;
  }

  .doc-logo {
    width: 60px !important;
    height: 60px !important;
    object-fit: contain !important;
    flex-shrink: 0 !important;
  }

  .doc-company-wrap {
    text-align: center !important;
  }

  .doc-company {
    font-size: 25px !important;
    font-family: "Matura MT Script Capitals", "Brush Script MT", cursive !important;
    font-weight: bold !important;
    color: #bb0000 !important;
    line-height: 1.05 !important;
  }

  .doc-tagline {
    font-size: 14px !important;
    font-family: "Harlow Solid Italic", "Dancing Script", cursive !important;
    font-style: italic !important;
    color: #0000bb !important;
    line-height: 1.05 !important;
  }

  .doc-red-line {
    border: none !important;
    border-top: 2px solid #bb0000 !important;
    margin: 0 0 16px 0 !important;
    opacity: 1 !important;
  }

  .doc-title-block {
    text-align: center !important;
    margin-bottom: 20px !important;
  }

  .doc-title {
    font-size: 13px !important;
    font-weight: bold !important;
    margin-top: 13px !important;
  }

  .doc-subtitle {
    font-size: 13px !important;
  }

  .doc-vm {
    margin-bottom: 20px !important;
    font-size: 13px !important;
  }

  .doc-vm p {
    margin: 0 0 12px !important;
  }

  .doc-table {
    width: 100% !important;
    border-collapse: collapse !important;
    table-layout: fixed !important;
    font-size: 13px !important;
    color: #000 !important;
  }

  .doc-table th,
  .doc-table td {
    border: 1px solid #000000 !important;
    padding: 8px !important;
    vertical-align: top !important;
  }

  .doc-table th {
    text-align: center !important;
    font-weight: bold !important;
    background: #ffffff !important;
  }

  .doc-table ol {
    margin: 4px 0 0 18px !important;
    padding: 0 !important;
  }

  .doc-table li {
    margin: 0 0 7px !important;
    padding-left: 2px !important;
  }

  .doc-line-list > div {
    margin-bottom: 7px !important;
  }

  .doc-goal-text {
    font-weight: bold !important;
  }

  .doc-objective-label {
    font-weight: bold !important;
    display: block !important;
    margin-top: 16px !important;
  }

  .doc-signatures {
    margin-top: 60px !important;
    display: flex !important;
    justify-content: space-between !important;
    gap: 30px !important;
  }

  .doc-signature {
    text-align: center !important;
    min-width: 200px !important;
    flex: 1 !important;
  }

  .doc-signature-label {
    font-size: 12px !important;
    margin-bottom: 44px !important;
  }

  .doc-signature-line {
    border-top: 1px solid #000000 !important;
    padding-top: 5px !important;
    display: inline-block !important;
    min-width: 200px !important;
  }

  .doc-signature-name {
    font-weight: bold !important;
  }

  .doc-signature-subtitle {
    font-size: 12px !important;
  }

  .side-head {
    padding: 18px !important;
    border-bottom: 1px solid var(--sp-border) !important;
    background: var(--sp-card-soft) !important;
  }

  .side-title {
    color: var(--sp-text) !important;
    font-size: 1rem !important;
    font-weight: 900 !important;
    line-height: 1.2 !important;
  }

  .side-subtitle {
    margin-top: 4px !important;
    color: var(--sp-muted) !important;
    font-size: 12.5px !important;
    font-weight: 700 !important;
  }

  .side-body {
    padding: 18px !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 12px !important;
  }

  .plan-meta {
    border: 1px solid var(--sp-border) !important;
    border-radius: 16px !important;
    background: var(--sp-card) !important;
    padding: 14px !important;
  }

  .plan-meta-label {
    color: var(--sp-muted) !important;
    font-size: 11px !important;
    font-weight: 900 !important;
    letter-spacing: .06em !important;
    text-transform: uppercase !important;
    margin-bottom: 3px !important;
  }

  .plan-meta-value {
    color: var(--sp-text) !important;
    font-size: 13px !important;
    font-weight: 800 !important;
    line-height: 1.4 !important;
    word-break: break-word !important;
  }

  .btn-primary,
  .btn-secondary,
  .btn-soft,
  .btn-danger {
    min-height: 44px !important;
    border-radius: 14px !important;
    padding: 11px 15px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 8px !important;
    font-size: 13px !important;
    font-weight: 900 !important;
    line-height: 1 !important;
    cursor: pointer !important;
    text-decoration: none !important;
    border: 1px solid transparent !important;
    transition: background .16s ease, border-color .16s ease, transform .16s ease, box-shadow .16s ease !important;
    white-space: nowrap !important;
  }

  .btn-primary {
    background: #334155 !important;
    color: #fff !important;
    box-shadow: 0 8px 16px rgba(51,65,85,.16) !important;
  }

  .btn-primary:hover:not(:disabled) {
    background: #253242 !important;
    transform: translateY(-1px) !important;
  }

  .btn-secondary {
    background: #eef2f7 !important;
    border-color: var(--sp-border) !important;
    color: var(--sp-text) !important;
  }

  .btn-soft {
    background: var(--sp-primary-soft) !important;
    border-color: rgba(47,128,237,.16) !important;
    color: var(--sp-primary) !important;
  }

  .btn-danger {
    background: var(--sp-red-soft) !important;
    border-color: rgba(228,88,116,.28) !important;
    color: var(--sp-red) !important;
  }

  .btn-danger:hover:not(:disabled) {
    border-color: rgba(228,88,116,.48) !important;
    transform: translateY(-1px) !important;
  }

  .btn-danger .spinner {
    border-color: rgba(228,88,116,.28) !important;
    border-top-color: var(--sp-red) !important;
  }

  .plan-action-row {
    width: 100% !important;
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 10px !important;
  }

  .btn-primary:disabled,
  .btn-secondary:disabled,
  .btn-soft:disabled,
  .btn-danger:disabled {
    opacity: .58 !important;
    cursor: not-allowed !important;
    transform: none !important;
    box-shadow: none !important;
  }

  .side-body .btn-primary,
  .side-body .btn-secondary,
  .side-body .btn-soft,
  .side-body .btn-danger {
    width: 100% !important;
  }

  .spinner {
    width: 14px !important;
    height: 14px !important;
    border: 2px solid rgba(255,255,255,.4) !important;
    border-top-color: #fff !important;
    border-radius: 50% !important;
    display: inline-block !important;
    animation: spin .7s linear infinite !important;
  }

  .loading-card {
    padding: 24px !important;
  }

  .skeleton {
    background: linear-gradient(90deg, var(--sp-border) 25%, var(--sp-muted-bg) 50%, var(--sp-border) 75%) !important;
    background-size: 200% 100% !important;
    animation: shimmer 1.4s infinite !important;
    border-radius: 12px !important;
  }

  .error-box {
    max-width: 840px !important;
    margin: 24px auto !important;
    padding: 18px 20px !important;
    border-radius: 18px !important;
    background: var(--sp-red-soft) !important;
    border: 1px solid rgba(228,88,116,.2) !important;
    color: var(--sp-red) !important;
    font-size: 14px !important;
    font-weight: 800 !important;
  }

  .toast {
    position: fixed !important;
    right: 24px !important;
    bottom: 24px !important;
    z-index: 9999 !important;
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
    padding: 12px 16px !important;
    border-radius: 14px !important;
    color: #fff !important;
    font-size: 14px !important;
    font-weight: 800 !important;
    box-shadow: 0 12px 28px rgba(0,0,0,.22) !important;
    animation: toastIn .2s ease !important;
  }

  .toast-icon {
    width: 22px !important;
    height: 22px !important;
    border-radius: 999px !important;
    background: rgba(255,255,255,.2) !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 12px !important;
    font-weight: 900 !important;
    flex-shrink: 0 !important;
  }


  .delete-modal-backdrop {
    position: fixed !important;
    inset: 0 !important;
    z-index: 9998 !important;
    background: rgba(15, 23, 42, .58) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 18px !important;
    animation: toastIn .18s ease !important;
  }

  .delete-modal {
    width: min(100%, 440px) !important;
    background: var(--sp-card) !important;
    color: var(--sp-text) !important;
    border: 1px solid var(--sp-border-strong) !important;
    border-radius: 24px !important;
    box-shadow: var(--sp-shadow) !important;
    padding: 22px !important;
  }

  .delete-modal-icon {
    width: 50px !important;
    height: 50px !important;
    border-radius: 16px !important;
    background: var(--sp-red-soft) !important;
    color: var(--sp-red) !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 22px !important;
    margin-bottom: 14px !important;
  }

  .delete-modal-title {
    margin: 0 !important;
    font-size: 1.22rem !important;
    line-height: 1.2 !important;
    font-weight: 900 !important;
    letter-spacing: -0.02em !important;
    color: var(--sp-text) !important;
  }

  .delete-modal-text {
    margin: 9px 0 0 !important;
    color: var(--sp-muted) !important;
    font-size: 13.5px !important;
    line-height: 1.55 !important;
    font-weight: 700 !important;
  }

  .delete-modal-plan {
    margin-top: 14px !important;
    padding: 12px 14px !important;
    border-radius: 14px !important;
    border: 1px solid var(--sp-border) !important;
    background: var(--sp-muted-bg) !important;
    color: var(--sp-text) !important;
    font-size: 13px !important;
    font-weight: 900 !important;
    line-height: 1.35 !important;
    word-break: break-word !important;
  }

  .delete-modal-warning {
    margin-top: 10px !important;
    color: var(--sp-red) !important;
    font-size: 12.5px !important;
    font-weight: 900 !important;
    line-height: 1.4 !important;
  }

  .delete-modal-actions {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 10px !important;
    margin-top: 18px !important;
  }

  .delete-modal-actions .btn-secondary,
  .delete-modal-actions .btn-danger {
    width: 100% !important;
  }

  @media print {
    @page {
      size: A4 landscape;
      margin: 8mm;
    }

    html,
    body {
      width: auto !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      background: #ffffff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .app-shell,
    .app-body,
    .app-main-col,
    #root {
      display: block !important;
      width: 100% !important;
      max-width: none !important;
      min-height: 0 !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      background: #ffffff !important;
    }

    .app-topbar,
    .app-sidebar-col,
    .preview-toolbar,
    .preview-side-card,
    .delete-modal-backdrop,
    .toast {
      display: none !important;
    }

    .preview-shell,
    .preview-grid,
    .preview-main-card,
    .preview-paper-wrap {
      display: block !important;
      width: 100% !important;
      max-width: none !important;
      min-height: 0 !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      background: #ffffff !important;
      overflow: visible !important;
    }

    .document-page {
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      min-height: 0 !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      box-shadow: none !important;
      border: none !important;
      background: #ffffff !important;
      color: #000000 !important;
      font-family: "Times New Roman", Times, serif !important;
      font-size: 9.5pt !important;
      line-height: 1.18 !important;
    }

    .doc-letterhead {
      margin-top: 0 !important;
      margin-bottom: 2mm !important;
      gap: 4mm !important;
    }

    .doc-logo {
      width: 15mm !important;
      height: 15mm !important;
    }

    .doc-company {
      font-size: 18pt !important;
      line-height: 1 !important;
    }

    .doc-tagline {
      font-size: 10pt !important;
      line-height: 1 !important;
    }

    .doc-red-line {
      margin: 0 0 4mm 0 !important;
      border-top-width: 1.5pt !important;
    }

    .doc-title-block {
      margin-bottom: 5mm !important;
    }

    .doc-title,
    .doc-subtitle,
    .doc-vm,
    .doc-table {
      font-size: 9.5pt !important;
    }

    .doc-vm {
      margin-bottom: 5mm !important;
    }

    .doc-vm p {
      margin: 0 0 3mm !important;
    }

    .doc-table {
      width: 100% !important;
      table-layout: fixed !important;
      border-collapse: collapse !important;
      page-break-inside: auto !important;
      break-inside: auto !important;
    }

    .doc-table th,
    .doc-table td {
      padding: 4pt !important;
      border: 1pt solid #000000 !important;
      vertical-align: top !important;
    }

    .doc-table tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .doc-table ol {
      margin: 2pt 0 0 14pt !important;
      padding: 0 !important;
    }

    .doc-table li {
      margin: 0 0 4pt !important;
      padding-left: 1pt !important;
    }

    .doc-line-list > div {
      margin-bottom: 4pt !important;
    }

    .doc-objective-label {
      margin-top: 10pt !important;
    }

    .doc-signatures {
      margin-top: 18mm !important;
      gap: 10mm !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .doc-signature-label {
      margin-bottom: 12mm !important;
    }

    .doc-signature,
    .doc-signature-line {
      min-width: 48mm !important;
    }

    a[href]::after {
      content: "" !important;
    }
  }

  @media (max-width: 1100px) {
    .preview-grid { grid-template-columns: 1fr !important; }
    .preview-side-card { position: relative !important; top: auto !important; order: -1 !important; }
  }

  @media (max-width: 760px) {
    .preview-shell {
      width: calc(100% - 16px) !important;
      padding: 0 !important;
      margin-top: 10px !important;
    }

    .preview-toolbar {
      display: grid !important;
      grid-template-columns: 1fr !important;
      padding: 16px !important;
    }

    .toolbar-actions {
      justify-content: stretch !important;
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
    }

    .toolbar-actions .btn-primary,
    .toolbar-actions .btn-secondary,
    .toolbar-actions .btn-soft,
    .toolbar-actions .btn-danger {
      width: 100% !important;
    }

    .preview-paper-wrap { padding: 14px !important; }
  }
`;

function Toast({ message, type }) {
  if (!message) return null;

  const cfg = {
    error: { bg: "#e45874", icon: "✕" },
    info: { bg: "#2f80ed", icon: "i" },
    success: { bg: "#21a55a", icon: "✓" },
  }[type] ?? { bg: "#202938", icon: "•" };

  return (
    <div className="toast" style={{ background: cfg.bg }}>
      <span className="toast-icon">{cfg.icon}</span>
      {message}
    </div>
  );
}

function Skeleton({ h = 40, mb = 8, w = "100%" }) {
  return <div className="skeleton" style={{ width: w, height: h, marginBottom: mb }} />;
}

function splitLines(text) {
  if (!text) return [];
  if (Array.isArray(text)) return text.map(String).map(s => s.trim()).filter(Boolean);
  return String(text)
    .replace(/\r/g, "")
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean);
}

function getPlanLines(goal) {
  if (Array.isArray(goal?.plans)) return goal.plans.map(String).map(s => s.trim()).filter(Boolean);
  return splitLines(goal?.plans || "");
}

function DocumentTable({ goals = [] }) {
  let planStart = 1;

  return (
    <table className="doc-table">
      <colgroup>
        <col style={{ width: "20.8%" }} />
        <col style={{ width: "20.8%" }} />
        <col style={{ width: "9.7%" }} />
        <col style={{ width: "11%" }} />
        <col style={{ width: "18.8%" }} />
        <col style={{ width: "18.9%" }} />
      </colgroup>

      <thead>
        <tr>
          {headers.map(h => <th key={h}>{h}</th>)}
        </tr>
      </thead>

      <tbody>
        {goals.map((g, rowIndex) => {
          const objectives = splitLines(g.objectives);
          const plans = getPlanLines(g);
          const currentPlanStart = planStart;
          planStart += Math.max(plans.length, 0);

          return (
            <tr key={g.id || rowIndex}>
              <td>
                <span className="doc-goal-text">Goal: {g.goal || ""}</span>
                <span className="doc-objective-label">Objective:</span>
                {objectives.length > 0 ? (
                  <ol>
                    {objectives.map((o, i) => <li key={i}>{o}</li>)}
                  </ol>
                ) : null}
              </td>

              <td>
                {plans.length > 0 ? (
                  <ol start={currentPlanStart}>
                    {plans.map((p, i) => <li key={i}>{p}</li>)}
                  </ol>
                ) : null}
              </td>

              <td><LineList lines={splitLines(g.timeline)} /></td>
              <td><LineList lines={splitLines(g.personnel)} /></td>
              <td><LineList lines={splitLines(g.metric)} /></td>
              <td><LineList lines={splitLines(g.remarks)} /></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function LineList({ lines }) {
  if (!lines || lines.length === 0) return null;
  return (
    <div className="doc-line-list">
      {lines.map((line, i) => <div key={i}>{line}</div>)}
    </div>
  );
}

function Signature({ name, subtitle, label }) {
  return (
    <div className="doc-signature">
      <div className="doc-signature-label">{label}</div>
      <div className="doc-signature-line">
        <div className="doc-signature-name">{name || ""}</div>
        <div className="doc-signature-subtitle">{subtitle || ""}</div>
      </div>
    </div>
  );
}

function DocumentPreview({ plan }) {
  return (
    <div className="document-page">
      <div className="doc-letterhead">
        <img src="../imgs/psi.png" className="doc-logo" alt="PSI logo" />
        <div className="doc-company-wrap">
          <div className="doc-company">Psy Systems and Innovations, OPC</div>
          <div className="doc-tagline">Your development is our achievement!</div>
        </div>
      </div>

      <hr className="doc-red-line" />

      <div className="doc-title-block">
        <div className="doc-title">{plan.plan_title || "Strategic Plan 2026"}</div>
        <div className="doc-subtitle">{plan.department || ""}</div>
      </div>

      <div className="doc-vm">
        <p><strong>Vision:</strong> {plan.vision || ""}</p>
        <p><strong>Mission:</strong> {plan.mission || ""}</p>
      </div>

      <DocumentTable goals={plan.goals || []} />

      <div className="doc-signatures">
        <Signature name={plan.prepared_by} subtitle={plan.prepared_by_title} label="Prepared By:" />
        <Signature name={plan.noted_by_exec_dir} subtitle="Executive Director" label="Noted By:" />
        <Signature name={plan.noted_by_president} subtitle="President, RPsy, CSAP, PhD" label="Noted By:" />
      </div>
    </div>
  );
}


function DeletePlanModal({ open, plan, deleting, onCancel, onConfirm }) {
  if (!open) return null;

  const planName = plan?.plan_title || "this strategic plan";
  const department = plan?.department ? ` — ${plan.department}` : "";

  return (
    <div
      className="delete-modal-backdrop"
      role="presentation"
      onMouseDown={() => {
        if (!deleting) onCancel();
      }}
    >
      <div
        className="delete-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-plan-title"
        aria-describedby="delete-plan-description"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="delete-modal-icon">
          <i className="bi bi-exclamation-triangle" />
        </div>

        <h2 id="delete-plan-title" className="delete-modal-title">
          Delete this strategic plan?
        </h2>

        <p id="delete-plan-description" className="delete-modal-text">
          Please confirm before deleting. This will permanently remove the selected strategic plan from the list.
        </p>

        <div className="delete-modal-plan">
          {planName}{department}
        </div>

        <div className="delete-modal-warning">
          This action cannot be undone.
        </div>

        <div className="delete-modal-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={deleting}
          >
            Cancel
          </button>

          <button
            type="button"
            className="btn-danger"
            onClick={onConfirm}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <span className="spinner" /> Deleting...
              </>
            ) : (
              <>
                <i className="bi bi-trash3" /> Yes, Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function SidePanel({ plan, planId, downloading, deleting, onDownload, onDelete }) {
  const goalsCount = plan?.goals?.length || 0;

  return (
    <aside className="preview-side-card">
      <div className="side-head">
        <div className="side-title">Preview Options</div>
        <div className="side-subtitle">Review the final format before downloading.</div>
      </div>

      <div className="side-body">
        <div className="plan-meta">
          <div className="plan-meta-label">Department</div>
          <div className="plan-meta-value">{plan?.department || "—"}</div>
        </div>

        <div className="plan-meta">
          <div className="plan-meta-label">Plan Title</div>
          <div className="plan-meta-value">{plan?.plan_title || "Strategic Plan 2026"}</div>
        </div>

        <div className="plan-meta">
          <div className="plan-meta-label">Goals</div>
          <div className="plan-meta-value">{goalsCount} strategic goal{goalsCount === 1 ? "" : "s"}</div>
        </div>

        {planId && (
          <div className="plan-action-row">
            <a href={`strategic-plan.html?plan_id=${planId}`} className="btn-soft">
              <i className="bi bi-pencil-square" /> Edit Plan
            </a>

            <button
              type="button"
              className="btn-danger"
              onClick={onDelete}
              disabled={deleting || downloading}
            >
              {deleting ? (
                <>
                  <span className="spinner" /> Deleting...
                </>
              ) : (
                <>
                  <i className="bi bi-trash3" /> Delete Plan
                </>
              )}
            </button>
          </div>
        )}

        <button type="button" className="btn-primary" onClick={onDownload} disabled={downloading || deleting}>
          {downloading ? (
            <>
              <span className="spinner" /> Preparing DOCX...
            </>
          ) : (
            <>
              <i className="bi bi-download" /> Download as DOCX
            </>
          )}
        </button>

        <a href="strategic-plan.html" className="btn-secondary">
          <i className="bi bi-arrow-left" /> Back to Plans
        </a>
      </div>
    </aside>
  );
}

function StrategicPlanPreview() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "success" });

  const planId = new URLSearchParams(window.location.search).get("id");

  const showToast = useCallback((message, type = "success") => {
    fireSileoToast(message, type).catch(() => {
      setToast({ message, type });
      setTimeout(() => setToast({ message: "", type: "success" }), 3200);
    });
  }, []);

  useEffect(() => {
    loadDocxLib().catch(() => {});
  }, []);


  useEffect(() => {
    if (!showDeleteModal) return;

    const handleEscape = (e) => {
      if (e.key === "Escape" && !deleting) {
        setShowDeleteModal(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [showDeleteModal, deleting]);

  useEffect(() => {
    if (!planId) {
      setLoadErr("Missing strategic plan ID.");
      setLoading(false);
      return;
    }

    fetch(`php/get_strategic_plan.php?id=${planId}`)
      .then(res => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data?.error) throw new Error(data.error);
        setPlan(data);
      })
      .catch(err => {
        console.error(err);
        setLoadErr(err.message || "Could not load strategic plan.");
      })
      .finally(() => setLoading(false));
  }, [planId]);

  const handleDownload = async () => {
    if (!plan) return;

    setDownloading(true);
    try {
      await generateDoc(plan);
      showToast("DOCX file is ready.", "success");
    } catch (err) {
      console.error(err);
      showToast(`Download failed: ${err.message}`, "error");
    } finally {
      setDownloading(false);
    }
  };

  const openDeleteModal = () => {
    if (!planId || deleting || downloading) return;
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (!deleting) {
      setShowDeleteModal(false);
    }
  };

  const handleDelete = async () => {
    if (!planId || deleting) return;

    setDeleting(true);
    try {
      const res = await fetch(`php/delete_strategic_plan.php?id=${encodeURIComponent(planId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: planId }),
      });

      const raw = await res.text();
      let data = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { message: raw };
      }

      if (!res.ok || data?.error) {
        throw new Error(data?.error || data?.message || `Server returned ${res.status}`);
      }

      setShowDeleteModal(false);
      showToast("Strategic plan deleted successfully.", "success");

      setTimeout(() => {
        window.location.href = "strategic-plan.html";
      }, 700);
    } catch (err) {
      console.error(err);
      showToast(`Delete failed: ${err.message}`, "error");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <div className="preview-shell">
          <div className="loading-card">
            <Skeleton h={24} mb={10} w="40%" />
            <Skeleton h={14} mb={18} w="62%" />
            <Skeleton h={54} mb={18} />
            <Skeleton h={460} mb={0} />
          </div>
        </div>
      </>
    );
  }

  if (loadErr) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <div className="error-box">
          <strong>Could not load strategic plan:</strong> {loadErr}
          <br />
          <button type="button" onClick={() => window.location.reload()} className="btn-primary" style={{ marginTop: 14 }}>
            Retry
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      <div className="preview-shell">
        <div className="preview-grid">
          <main className="preview-main-card">
            <div className="preview-toolbar">
              <div className="toolbar-left">
                <div className="toolbar-icon">
                  <i className="bi bi-file-earmark-word" />
                </div>
                <div>
                  <h1 className="toolbar-title">Strategic Plan Preview</h1>
                  <p className="toolbar-subtitle">The preview below follows the final Word document layout.</p>
                </div>
              </div>
            </div>

            <div className="preview-paper-wrap">
              <DocumentPreview plan={plan} />
            </div>
          </main>

          <SidePanel
            plan={plan}
            planId={planId}
            downloading={downloading}
            deleting={deleting}
            onDownload={handleDownload}
            onDelete={openDeleteModal}
          />
        </div>
      </div>

      <DeletePlanModal
        open={showDeleteModal}
        plan={plan}
        deleting={deleting}
        onCancel={closeDeleteModal}
        onConfirm={handleDelete}
      />

      <Toast message={toast.message} type={toast.type} />
    </>
  );
}

/* ─── DOCX LIBRARY LOADER ─── */
function loadDocxLib() {
  if (window.docx) return Promise.resolve(window.docx);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-docx-loader="true"]');
    if (existing) {
      existing.addEventListener("load", () => window.docx ? resolve(window.docx) : reject(new Error("docx loaded but window.docx is undefined")));
      existing.addEventListener("error", () => reject(new Error("Failed to load docx library from CDN")));
      return;
    }

    const script = document.createElement("script");
    script.dataset.docxLoader = "true";
    script.src = "https://unpkg.com/docx@9.5.3/build/index.min.js";
    script.onload = () => window.docx ? resolve(window.docx) : reject(new Error("docx loaded but window.docx is undefined"));
    script.onerror = () => reject(new Error("Failed to load docx library from CDN"));
    document.head.appendChild(script);
  });
}

async function fetchLogoBytes() {
  try {
    const res = await fetch("../imgs/psi.png");
    if (!res.ok) throw new Error("logo not found");
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

async function generateDoc(plan) {
  const docxLib = await loadDocxLib();
  const {
    Document, Packer, Paragraph, TextRun,
    Table, TableRow, TableCell,
    WidthType, BorderStyle, AlignmentType,
    ShadingType, VerticalAlign,
    PageOrientation, ImageRun, Header,
  } = docxLib;

  const PAGE_W = 11906;
  const PAGE_H = 16838;
  const MARGIN = 720;
  const TOP_MARGIN = 1440;
  const CONTENT_W = PAGE_H - MARGIN * 2;
  const COL_WIDTHS = [3200, 3200, 1500, 1700, 2900, 2898];

  const solidBorder = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  const allBorders = { top: solidBorder, bottom: solidBorder, left: solidBorder, right: solidBorder };
  const noBorders = {
    top: { style: BorderStyle.NONE },
    bottom: { style: BorderStyle.NONE },
    left: { style: BorderStyle.NONE },
    right: { style: BorderStyle.NONE },
  };
  const noTableBorders = {
    ...noBorders,
    insideH: { style: BorderStyle.NONE },
    insideV: { style: BorderStyle.NONE },
  };

  const CELL_MARGINS = { top: 80, bottom: 80, left: 120, right: 120 };

  const p = (text, opts = {}) =>
    new Paragraph({
      spacing: opts.spacing,
      alignment: opts.alignment,
      children: [new TextRun({ text: text || "", size: 20, font: "Times New Roman", ...opts.run })],
    });

  const makeCell = (children, colIdx, options = {}) =>
    new TableCell({
      borders: allBorders,
      width: { size: COL_WIDTHS[colIdx], type: WidthType.DXA },
      margins: CELL_MARGINS,
      verticalAlign: VerticalAlign.TOP,
      ...options,
      children,
    });

  const makeHeaderCell = (text, colIdx) =>
    new TableCell({
      borders: allBorders,
      width: { size: COL_WIDTHS[colIdx], type: WidthType.DXA },
      margins: CELL_MARGINS,
      shading: { fill: "FFFFFF", type: ShadingType.CLEAR },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text, bold: true, color: "000000", size: 20, font: "Times New Roman" })],
        }),
      ],
    });

  const numberedManualP = (number, text) =>
    new Paragraph({
      indent: { left: 360, hanging: 260 },
      children: [new TextRun({ text: `${number}. ${text || ""}`, size: 20, font: "Times New Roman" })],
    });

  const tableHeaderRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => makeHeaderCell(h, i)),
  });

  let planCounter = 1;

  const dataRows = (plan.goals || []).map((g) => {
    const objLines = splitLines(g.objectives);
    const planLines = getPlanLines(g);
    const timeLines = splitLines(g.timeline);
    const persLines = splitLines(g.personnel);
    const metLines = splitLines(g.metric);
    const remLines = splitLines(g.remarks);

    const col0Children = [
      new Paragraph({ children: [new TextRun({ text: `Goal: ${g.goal || ""}`, bold: true, size: 20, font: "Times New Roman" })] }),
      new Paragraph({ children: [new TextRun({ text: "" })] }),
      new Paragraph({ children: [new TextRun({ text: "Objective:", bold: true, size: 20, font: "Times New Roman" })] }),
      ...(objLines.length ? objLines.map((o, i) => numberedManualP(i + 1, o)) : [p("")]),
    ];

    const col1Children = planLines.length
      ? planLines.map((line) => numberedManualP(planCounter++, line))
      : [p("")];

    const linesOrBlank = (lines) => lines.length ? lines.map(l => p(l)) : [p("")];

    return new TableRow({
      children: [
        makeCell(col0Children, 0),
        makeCell(col1Children, 1),
        makeCell(linesOrBlank(timeLines), 2),
        makeCell(linesOrBlank(persLines), 3),
        makeCell(linesOrBlank(metLines), 4),
        makeCell(linesOrBlank(remLines), 5),
      ],
    });
  });

  const SIG_COL = Math.round(CONTENT_W / 3);

  const makeSigCell = (label, name, subtitle) =>
    new TableCell({
      borders: noBorders,
      width: { size: SIG_COL, type: WidthType.DXA },
      margins: { top: 0, bottom: 0, left: 200, right: 200 },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 560 },
          children: [new TextRun({ text: label, size: 20, font: "Times New Roman" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 40 },
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 1 } },
          children: [new TextRun({ text: name || "", bold: true, size: 20, font: "Times New Roman" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
          children: [new TextRun({ text: subtitle || "", size: 20, font: "Times New Roman" })],
        }),
      ],
    });

  const sigTable = new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [SIG_COL, SIG_COL, SIG_COL],
    borders: noTableBorders,
    rows: [
      new TableRow({
        children: [
          makeSigCell("Prepared By:", plan.prepared_by, plan.prepared_by_title || ""),
          makeSigCell("Noted By:", plan.noted_by_exec_dir, "Executive Director"),
          makeSigCell("Noted By:", plan.noted_by_president, "President, RPsy, CSAP, PhD"),
        ],
      }),
    ],
  });

  const logoBytes = await fetchLogoBytes();

  const letterheadTable = new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [CONTENT_W],
    borders: noTableBorders,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: noBorders,
            width: { size: CONTENT_W, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 0, bottom: 0, left: 0, right: 0 },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [
                  ...(logoBytes ? [new ImageRun({ data: logoBytes, transformation: { width: 60, height: 60 } })] : []),
                  new TextRun({ text: "  ", size: 50 }),
                  new TextRun({
                    text: "Psy Systems and Innovations, OPC",
                    font: "Matura MT Script Capitals",
                    size: 50,
                    color: "bb0000",
                    bold: true,
                  }),
                ],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 0 },
                children: [
                  new TextRun({
                    text: "Your development is our achievement!",
                    font: "Harlow Solid Italic",
                    size: 28,
                    color: "0000bb",
                    italics: true,
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const redRule = new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 16, color: "bb0000", space: 1 } },
    spacing: { before: 60, after: 0 },
    children: [new TextRun({ text: "" })],
  });

  const pageHeader = new Header({ children: [letterheadTable, redRule] });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: PAGE_W,
              height: PAGE_H,
              orientation: PageOrientation.LANDSCAPE,
            },
            margin: { top: TOP_MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
          },
        },
        headers: { default: pageHeader },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 160, after: 0 },
            children: [new TextRun({ text: plan.plan_title || "Strategic Plan 2026", bold: true, size: 20, font: "Times New Roman" })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 200 },
            children: [new TextRun({ text: plan.department || "", size: 20, font: "Times New Roman" })],
          }),
          new Paragraph({
            spacing: { before: 0, after: 80 },
            children: [
              new TextRun({ text: "Vision: ", bold: true, size: 20, font: "Times New Roman" }),
              new TextRun({ text: plan.vision || "", size: 20, font: "Times New Roman" }),
            ],
          }),
          new Paragraph({
            spacing: { before: 0, after: 200 },
            children: [
              new TextRun({ text: "Mission: ", bold: true, size: 20, font: "Times New Roman" }),
              new TextRun({ text: plan.mission || "", size: 20, font: "Times New Roman" }),
            ],
          }),
          new Table({
            width: { size: CONTENT_W, type: WidthType.DXA },
            columnWidths: COL_WIDTHS,
            rows: [tableHeaderRow, ...dataRows],
          }),
          new Paragraph({ children: [new TextRun({ text: "" })] }),
          new Paragraph({ children: [new TextRun({ text: "" })] }),
          sigTable,
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `Strategic_Plan_${(plan.department || "").replace(/\s+/g, "_") || "export"}.docx`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<StrategicPlanPreview />);
