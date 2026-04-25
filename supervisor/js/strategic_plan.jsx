const { useState, useEffect, useCallback, useRef } = React;

// ── Utility ───────────────────────────────────────────────────────────────────
let _idCounter = 0;
const nextId = () => ++_idCounter;

const URL_PLAN_ID = (() => {
  const p = new URLSearchParams(window.location.search).get("plan_id");
  return p ? parseInt(p, 10) : 0;
})();

const splitLines = (value = "") =>
  String(value)
    .replace(/\r/g, "")
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean);

function makeGoal(prefill = {}) {
  return {
    id: nextId(),
    dbId: null,
    goal: "",
    objectives: "",
    plans: [""],
    timeline: "",
    personnel: "",
    personnelIds: [],
    metric: "",
    remarks: "",
    ...prefill,
  };
}

const STEP_META = [
  { key: "doc", label: "Document Info", icon: "bi-file-earmark-text" },
  { key: "vision", label: "Vision & Mission", icon: "bi-lightbulb" },
  { key: "goals", label: "Strategic Goals", icon: "bi-house-door-fill" },
  { key: "noted", label: "Noted By", icon: "bi-grid-3x3-gap-fill" },
];

// ── Sileo Toast ───────────────────────────────────────────────────────────────
const SILEO_IMPORT_URL = "https://esm.sh/sileo?deps=react@18.3.1,react-dom@18.3.1";
let sileoModulePromise = null;

function getSileoTitle(type) {
  if (type === "success") return "Success";
  if (type === "error") return "Action needed";
  if (type === "info") return "Information";
  if (type === "warning") return "Warning";
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
    --sp-line: #d7dee8;
    --sp-text: #1f2937;
    --sp-muted: #7b8799;
    --sp-subtle: #9eabbc;
    --sp-primary: #2f80ed;
    --sp-primary-soft: #e8f1ff;
    --sp-primary-strong: #256fd4;
    --sp-green: #21a55a;
    --sp-green-soft: #e8f7ee;
    --sp-red: #e45874;
    --sp-red-soft: #fde8ed;
    --sp-amber: #f0a317;
    --sp-shadow-soft: 0 10px 28px rgba(20, 32, 51, 0.05);
    --sp-shadow: 0 16px 30px rgba(20, 32, 51, 0.08);
  }

  [data-theme="dark"] {
    --sp-bg: #0e1624;
    --sp-card: #151f31;
    --sp-card-soft: #182338;
    --sp-muted-bg: #121b2b;
    --sp-border: rgba(255,255,255,0.08);
    --sp-border-strong: rgba(255,255,255,0.14);
    --sp-line: rgba(255,255,255,0.12);
    --sp-text: #f4f7fb;
    --sp-muted: #9badc2;
    --sp-subtle: #7f93ab;
    --sp-primary: #7ea5ff;
    --sp-primary-soft: rgba(126,165,255,0.16);
    --sp-primary-strong: #95b6ff;
    --sp-green: #33c77a;
    --sp-green-soft: rgba(51,199,122,0.14);
    --sp-red: #ff6b86;
    --sp-red-soft: rgba(255,107,134,0.13);
    --sp-shadow-soft: 0 10px 28px rgba(0,0,0,.25);
    --sp-shadow: 0 16px 34px rgba(0,0,0,.34);
  }

  html, body { margin: 0; padding: 0; }

  body {
    font-family: "Nunito", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
    background: var(--sp-bg) !important;
    color: var(--sp-text) !important;
  }

  input, textarea, select, button { font-family: inherit !important; }

  input::placeholder,
  textarea::placeholder {
    color: var(--sp-subtle) !important;
    font-weight: 700 !important;
  }

  a { color: inherit; text-decoration: none; }

  #root {
    width: 100%;
    min-height: 100%;
    padding-bottom: 42px;
    color: var(--sp-text);
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .page-shell {
    width: min(100%, 1280px) !important;
    margin: 22px auto 0 !important;
    padding: 0 14px !important;
  }

  .page-grid {
    display: grid !important;
    grid-template-columns: minmax(0, 1fr) 320px !important;
    gap: 22px !important;
    align-items: start !important;
  }

  .wizard-shell,
  .history-card,
  .loading-card {
    background: var(--sp-card) !important;
    border: 1px solid var(--sp-border) !important;
    border-radius: 24px !important;
    box-shadow: var(--sp-shadow-soft) !important;
  }

  .wizard-shell {
    overflow: visible !important;
  }

  .history-card {
    overflow: hidden !important;
    position: sticky !important;
    top: 16px !important;
    align-self: start !important;
  }

  .wizard-topbar {
    padding: 22px 24px 16px !important;
    border-bottom: 1px solid var(--sp-border) !important;
    background: var(--sp-card) !important;
  }

  .wizard-title {
    margin: 0 !important;
    font-size: 1.55rem !important;
    line-height: 1.15 !important;
    font-weight: 900 !important;
    letter-spacing: -0.03em !important;
    color: var(--sp-text) !important;
  }

  .wizard-subtitle {
    margin: 8px 0 0 !important;
    font-size: 13px !important;
    line-height: 1.45 !important;
    font-weight: 700 !important;
    color: var(--sp-muted) !important;
  }

  .wizard-stepper-wrap {
    padding: 22px 26px 15px !important;
    background: var(--sp-card) !important;
  }

  .wizard-stepper {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 8px !important;
    align-items: start !important;
  }

  .wizard-step {
    position: relative !important;
    min-width: 0 !important;
    text-align: center !important;
  }

  .wizard-step-top {
    position: relative !important;
    min-height: 34px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  .wizard-line {
    position: absolute !important;
    top: 16px !important;
    left: calc(50% + 20px) !important;
    width: calc(100% - 40px) !important;
    height: 3px !important;
    border-radius: 999px !important;
    background: var(--sp-line) !important;
    z-index: 0 !important;
  }

  .wizard-line.done {
    background: var(--sp-green) !important;
  }

  .wizard-line.active {
    background: linear-gradient(90deg, #4f46e5 0%, #4f46e5 42%, var(--sp-line) 42%, var(--sp-line) 100%) !important;
  }

  .wizard-circle {
    width: 34px !important;
    height: 34px !important;
    min-width: 34px !important;
    border-radius: 999px !important;
    position: relative !important;
    z-index: 2 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    background: var(--sp-card) !important;
  }

  .wizard-step-icon {
    font-size: 14px !important;
    line-height: 1 !important;
  }

  .wizard-circle.done {
    background: var(--sp-green) !important;
    color: #fff !important;
    border: none !important;
    box-shadow: 0 0 0 4px rgba(33,165,90,.10) !important;
  }

  .wizard-circle.active {
    background: linear-gradient(135deg, #2563eb 0%, #4f46e5 54%, #6d5dfc 100%) !important;
    border: 4px solid rgba(255,255,255,.92) !important;
    color: #ffffff !important;
    box-shadow:
      0 0 0 3px rgba(79,70,229,.18),
      0 8px 16px rgba(79,70,229,.22) !important;
  }

  .wizard-circle.todo {
    background: var(--sp-card) !important;
    border: 2px solid #d4d7dc !important;
    color: #7f858d !important;
    box-shadow: inset 0 0 0 3px rgba(212,215,220,.22) !important;
  }

  [data-theme="dark"] .wizard-circle.todo {
    border-color: rgba(255,255,255,.25) !important;
    color: rgba(255,255,255,.62) !important;
    box-shadow: inset 0 0 0 3px rgba(255,255,255,.04) !important;
  }

  .wizard-label {
    margin-top: 10px !important;
    font-size: 12px !important;
    line-height: 1.35 !important;
    font-weight: 800 !important;
    padding: 0 4px !important;
    word-break: break-word !important;
  }

  .wizard-label.done { color: var(--sp-green) !important; }
  .wizard-label.active { color: #4f46e5 !important; }
  .wizard-label.todo { color: #7c7c7c !important; }

  [data-theme="dark"] .wizard-label.todo { color: var(--sp-muted) !important; }

  .wizard-panel { padding: 0 0 10px !important; }

  .step-card-head {
    padding: 18px 24px !important;
    border-top: 1px solid var(--sp-border) !important;
    border-bottom: 1px solid var(--sp-border) !important;
    background: var(--sp-card-soft) !important;
    display: flex !important;
    align-items: center !important;
    gap: 14px !important;
  }

  .step-badge {
    width: 42px !important;
    height: 42px !important;
    min-width: 42px !important;
    border-radius: 14px !important;
    background: var(--sp-primary-soft) !important;
    color: var(--sp-primary) !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 14px !important;
    font-weight: 900 !important;
    border: 1px solid rgba(47,128,237,.12) !important;
  }

  .step-heading {
    font-size: 1.03rem !important;
    line-height: 1.2 !important;
    font-weight: 900 !important;
    color: var(--sp-text) !important;
    letter-spacing: -0.02em !important;
  }

  .step-subheading {
    margin-top: 4px !important;
    font-size: 12.5px !important;
    line-height: 1.4 !important;
    color: var(--sp-muted) !important;
    font-weight: 700 !important;
  }

  .step-body {
    padding: 24px !important;
    animation: fadeUp .18s ease !important;
  }

  .form-grid-2 {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 22px !important;
  }

  .field-label {
    margin-bottom: 8px !important;
    color: var(--sp-text) !important;
    font-size: 13px !important;
    font-weight: 800 !important;
    line-height: 1.2 !important;
  }

  .required-star {
    color: var(--sp-red) !important;
    margin-left: 3px !important;
  }

  .field-hint {
    margin-top: 7px !important;
    color: var(--sp-muted) !important;
    font-size: 12px !important;
    font-weight: 700 !important;
  }

  .inp {
    width: 100% !important;
    min-height: 52px !important;
    padding: 13px 16px !important;
    border: 1px solid var(--sp-border-strong) !important;
    border-radius: 14px !important;
    background: var(--sp-card) !important;
    color: var(--sp-text) !important;
    outline: none !important;
    font-size: 14px !important;
    font-weight: 800 !important;
    box-shadow: none !important;
    transition: border-color .16s ease, box-shadow .16s ease, background .16s ease !important;
  }

  .inp:hover:not(:focus) {
    border-color: var(--sp-border-strong) !important;
    background: var(--sp-card-soft) !important;
  }

  .inp:focus {
    border-color: var(--sp-primary) !important;
    box-shadow: 0 0 0 4px rgba(47,128,237,.10) !important;
    background: var(--sp-card) !important;
  }

  textarea.inp {
    min-height: 130px !important;
    resize: vertical !important;
    line-height: 1.55 !important;
  }

  .divider {
    border: none !important;
    border-top: 1px solid var(--sp-border) !important;
    margin: 18px 0 !important;
  }

  .tag {
    min-height: 24px !important;
    border-radius: 999px !important;
    padding: 4px 10px !important;
    display: inline-flex !important;
    align-items: center !important;
    gap: 6px !important;
    font-size: 11px !important;
    font-weight: 900 !important;
    line-height: 1 !important;
  }

  .tag-blue { background: var(--sp-primary-soft) !important; color: var(--sp-primary) !important; }
  .tag-green { background: var(--sp-green-soft) !important; color: var(--sp-green) !important; }
  .tag-muted { background: var(--sp-muted-bg) !important; color: var(--sp-muted) !important; border: 1px solid var(--sp-border) !important; }

  .goals-stack {
    display: flex !important;
    flex-direction: column !important;
    gap: 14px !important;
  }

  .goal-card {
    border: 1px solid var(--sp-border) !important;
    border-radius: 18px !important;
    background: var(--sp-card) !important;
    overflow: visible !important;
    position: relative !important;
  }

  .goal-header {
    width: 100% !important;
    border: none !important;
    background: var(--sp-card) !important;
    padding: 16px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 12px !important;
    cursor: pointer !important;
    text-align: left !important;
  }

  .goal-header.open {
    background: var(--sp-card-soft) !important;
    border-bottom: 1px solid var(--sp-border) !important;
  }

  .goal-summary-left {
    display: flex !important;
    align-items: center !important;
    gap: 12px !important;
    min-width: 0 !important;
  }

  .goal-number {
    width: 34px !important;
    height: 34px !important;
    min-width: 34px !important;
    border-radius: 10px !important;
    background: var(--sp-primary-soft) !important;
    color: var(--sp-primary) !important;
    font-size: 13px !important;
    font-weight: 900 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  .goal-title-text {
    font-size: 14px !important;
    font-weight: 900 !important;
    color: var(--sp-text) !important;
    line-height: 1.35 !important;
    word-break: break-word !important;
  }

  .goal-empty-title {
    color: var(--sp-subtle) !important;
    font-style: italic !important;
    font-weight: 700 !important;
  }

  .goal-meta {
    margin-top: 5px !important;
    display: flex !important;
    gap: 7px !important;
    flex-wrap: wrap !important;
  }

  .goal-header-actions {
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    flex-shrink: 0 !important;
  }

  .goal-chevron { color: var(--sp-muted) !important; transition: transform .18s ease !important; }
  .goal-header.open .goal-chevron { transform: rotate(180deg) !important; }

  .goal-body {
    padding: 18px 16px 16px !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 18px !important;
  }

  .plan-step-row {
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
    margin-bottom: 10px !important;
  }

  .plan-step-number {
    width: 30px !important;
    height: 30px !important;
    min-width: 30px !important;
    border-radius: 10px !important;
    background: rgba(47,128,237,.10) !important;
    color: var(--sp-primary) !important;
    border: 1px solid rgba(47,128,237,.16) !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 12px !important;
    font-weight: 900 !important;
  }

  .personnel-picker {
    position: relative !important;
    z-index: 200 !important;
  }

  .personnel-trigger {
    cursor: pointer !important;
    min-height: 52px !important;
    display: flex !important;
    align-items: center !important;
    flex-wrap: wrap !important;
    gap: 6px !important;
    padding: 9px 12px !important;
  }

  .personnel-trigger.open {
    border-color: var(--sp-primary) !important;
    box-shadow: 0 0 0 4px rgba(47,128,237,.10) !important;
  }

  .personnel-placeholder {
    color: var(--sp-subtle) !important;
    line-height: 28px !important;
    font-size: 14px !important;
    font-weight: 700 !important;
  }

  .personnel-caret {
    margin-left: auto !important;
    line-height: 28px !important;
    font-size: 11px !important;
    color: var(--sp-muted) !important;
  }

  .personnel-remove {
    cursor: pointer !important;
    font-size: 12px !important;
    font-weight: 900 !important;
    opacity: .75 !important;
  }

  .personnel-menu {
    position: absolute !important;
    top: calc(100% + 8px) !important;
    left: 0 !important;
    right: 0 !important;
    z-index: 999 !important;
    background: var(--sp-card) !important;
    border: 1px solid var(--sp-border) !important;
    border-radius: 16px !important;
    box-shadow: 0 18px 38px rgba(20,32,51,.14) !important;
    overflow: hidden !important;
  }

  .personnel-menu-search {
    padding: 10px !important;
    background: var(--sp-muted-bg) !important;
    border-bottom: 1px solid var(--sp-border) !important;
  }

  .personnel-menu-search .inp {
    min-height: 42px !important;
    height: 42px !important;
    padding: 9px 12px !important;
    border-radius: 12px !important;
    font-size: 13px !important;
    box-shadow: none !important;
  }

  .personnel-menu-search .inp:focus {
    box-shadow: 0 0 0 3px rgba(47,128,237,.10) !important;
  }

  .personnel-options {
    max-height: 240px !important;
    overflow-y: auto !important;
    overscroll-behavior: contain !important;
    scrollbar-width: thin !important;
  }

  .personnel-options::-webkit-scrollbar {
    width: 8px !important;
  }

  .personnel-options::-webkit-scrollbar-thumb {
    background: #c7d1df !important;
    border-radius: 999px !important;
    border: 2px solid var(--sp-card) !important;
  }

  .personnel-option {
    min-height: 52px !important;
    padding: 10px 16px !important;
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
    cursor: pointer !important;
    transition: background .14s ease !important;
  }

  .personnel-option:hover { background: var(--sp-card-soft) !important; }
  .personnel-option.is-selected { background: var(--sp-primary-soft) !important; }

  .personnel-check {
    width: 18px !important;
    height: 18px !important;
    min-width: 18px !important;
    border-radius: 6px !important;
    border: 2px solid var(--sp-border-strong) !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  .personnel-option.is-selected .personnel-check {
    background: var(--sp-primary) !important;
    border-color: var(--sp-primary) !important;
    color: #fff !important;
  }

  .personnel-name {
    flex: 1 !important;
    min-width: 0 !important;
    font-size: 14px !important;
    font-weight: 800 !important;
    color: var(--sp-text) !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  .personnel-role-pill {
    max-width: 130px !important;
    justify-content: center !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
  }

  .personnel-empty {
    padding: 16px !important;
    color: var(--sp-muted) !important;
    font-size: 13px !important;
    font-weight: 700 !important;
  }

  .personnel-footer {
    padding: 10px 16px !important;
    border-top: 1px solid var(--sp-border) !important;
    background: var(--sp-muted-bg) !important;
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 10px !important;
  }

  .personnel-clear {
    border: none !important;
    background: transparent !important;
    color: var(--sp-red) !important;
    font-size: 12px !important;
    font-weight: 900 !important;
    cursor: pointer !important;
    padding: 0 !important;
  }

  .empty-state {
    padding: 28px 12px !important;
    text-align: center !important;
    color: var(--sp-muted) !important;
    font-size: 13px !important;
    line-height: 1.6 !important;
    font-weight: 700 !important;
  }

  .empty-state-icon {
    width: 42px !important;
    height: 42px !important;
    border-radius: 14px !important;
    background: var(--sp-muted-bg) !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    color: var(--sp-muted) !important;
    font-size: 18px !important;
    margin-bottom: 10px !important;
  }

  .wizard-actions {
    padding: 18px 24px 22px !important;
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 16px !important;
    border-top: 1px solid var(--sp-border) !important;
    margin-top: 6px !important;
  }

  .btn-primary,
  .btn-secondary,
  .btn-add,
  .btn-danger-lite {
    min-height: 48px !important;
    border-radius: 14px !important;
    padding: 12px 16px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 8px !important;
    font-size: 14px !important;
    font-weight: 900 !important;
    line-height: 1 !important;
    cursor: pointer !important;
    transition: background .16s ease, border-color .16s ease, box-shadow .16s ease, transform .16s ease !important;
    white-space: nowrap !important;
  }

  .btn-primary {
    border: 1px solid transparent !important;
    background: #334155 !important;
    color: #fff !important;
    box-shadow: 0 8px 16px rgba(51,65,85,.16) !important;
  }

  .btn-primary:hover:not(:disabled) {
    background: #253242 !important;
    transform: translateY(-1px) !important;
  }

  .btn-secondary {
    border: 1px solid var(--sp-border) !important;
    background: #eef2f7 !important;
    color: var(--sp-text) !important;
  }

  .btn-secondary:hover:not(:disabled) { background: #e7edf5 !important; }

  .btn-primary:disabled,
  .btn-secondary:disabled {
    opacity: .6 !important;
    cursor: not-allowed !important;
    transform: none !important;
    box-shadow: none !important;
  }

  .btn-add {
    min-height: 44px !important;
    border: 1px solid rgba(47,128,237,.18) !important;
    background: var(--sp-primary-soft) !important;
    color: var(--sp-primary) !important;
  }

  .btn-add:hover { background: #dce9ff !important; }

  .btn-danger-lite {
    min-height: 34px !important;
    padding: 8px 12px !important;
    border: 1px solid rgba(228,88,116,.18) !important;
    background: var(--sp-red-soft) !important;
    color: var(--sp-red) !important;
    font-size: 12px !important;
  }

  .btn-danger-lite:hover { background: #fce0e7 !important; }

  .save-spinner {
    width: 14px !important;
    height: 14px !important;
    border: 2px solid rgba(255,255,255,.4) !important;
    border-top-color: #fff !important;
    border-radius: 50% !important;
    display: inline-block !important;
    animation: spin .7s linear infinite !important;
  }

  .history-head {
    padding: 18px 18px !important;
    border-bottom: 1px solid var(--sp-border) !important;
    background: var(--sp-card-soft) !important;
  }

  .history-title {
    font-size: 1rem !important;
    font-weight: 900 !important;
    color: var(--sp-text) !important;
    line-height: 1.2 !important;
  }

  .history-subtitle {
    margin-top: 4px !important;
    font-size: 12.5px !important;
    color: var(--sp-muted) !important;
    font-weight: 700 !important;
  }

  .history-body {
    max-height: 600px !important;
    overflow-y: auto !important;
  }

  .history-item {
    display: block !important;
    padding: 15px 16px !important;
    border-bottom: 1px solid var(--sp-border) !important;
    transition: background .16s ease !important;
  }

  .history-item:hover { background: var(--sp-card-soft) !important; }
  .history-item.active { background: var(--sp-primary-soft) !important; }

  .history-item-title {
    font-size: 13.5px !important;
    font-weight: 900 !important;
    line-height: 1.35 !important;
    color: var(--sp-text) !important;
    margin-bottom: 5px !important;
  }

  .history-snippet {
    font-size: 11.5px !important;
    line-height: 1.5 !important;
    color: var(--sp-muted) !important;
    font-weight: 700 !important;
    margin-bottom: 8px !important;
  }

  .history-meta-row {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 8px !important;
  }

  .history-user {
    display: flex !important;
    align-items: center !important;
    gap: 6px !important;
    min-width: 0 !important;
  }

  .history-avatar {
    width: 22px !important;
    height: 22px !important;
    min-width: 22px !important;
    border-radius: 999px !important;
    background: var(--sp-primary-soft) !important;
    color: var(--sp-primary) !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 9px !important;
    font-weight: 900 !important;
  }

  .history-creator {
    font-size: 11.5px !important;
    color: var(--sp-muted) !important;
    font-weight: 800 !important;
  }

  .history-date {
    font-size: 10.5px !important;
    font-weight: 800 !important;
    color: var(--sp-muted) !important;
    background: var(--sp-muted-bg) !important;
    border: 1px solid var(--sp-border) !important;
    border-radius: 999px !important;
    padding: 4px 8px !important;
    white-space: nowrap !important;
  }

  .history-footer {
    padding: 12px 18px !important;
    border-top: 1px solid var(--sp-border) !important;
    background: var(--sp-card-soft) !important;
  }

  .history-footer a {
    color: var(--sp-primary) !important;
    font-size: 12.5px !important;
    font-weight: 900 !important;
    display: inline-flex !important;
    align-items: center !important;
    gap: 5px !important;
  }

  .skeleton {
    background: linear-gradient(90deg, var(--sp-border) 25%, var(--sp-muted-bg) 50%, var(--sp-border) 75%) !important;
    background-size: 200% 100% !important;
    animation: shimmer 1.4s infinite !important;
    border-radius: 12px !important;
  }

  .loading-card { padding: 22px !important; }

  .sp-error-box {
    width: min(100%, 980px) !important;
    margin: 24px auto !important;
    padding: 20px !important;
    border-radius: 18px !important;
    background: var(--sp-red-soft) !important;
    border: 1px solid rgba(228,88,116,.2) !important;
    color: var(--sp-red) !important;
    font-size: 14px !important;
    font-weight: 800 !important;
  }

  @media (max-width: 1100px) {
    .page-grid { grid-template-columns: 1fr !important; }
    .history-card { position: relative !important; top: auto !important; }
  }

  @media (max-width: 760px) {
    .page-shell {
      width: calc(100% - 16px) !important;
      padding: 0 !important;
      margin-top: 10px !important;
    }

    .wizard-topbar,
    .wizard-stepper-wrap,
    .step-body,
    .wizard-actions,
    .history-head {
      padding-left: 16px !important;
      padding-right: 16px !important;
    }

    .step-card-head { padding: 16px !important; }
    .form-grid-2 { grid-template-columns: 1fr !important; gap: 16px !important; }
    .wizard-actions { grid-template-columns: 1fr !important; gap: 12px !important; }
  }

  @media (max-width: 540px) {
    .wizard-stepper-wrap {
      overflow-x: auto !important;
      padding-bottom: 16px !important;
    }

    .wizard-stepper { min-width: 540px !important; }
    .btn-primary, .btn-secondary { width: 100% !important; }
  }
`;

function Field({ label, required, hint, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div className="field-label">
        {label}
        {required && <span className="required-star">*</span>}
      </div>
      {children}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

function FocusInput({ className = "", ...props }) {
  return <input className={`inp ${className}`} {...props} />;
}

function FocusTextarea({ className = "", ...props }) {
  return <textarea className={`inp ${className}`} {...props} />;
}

function Divider() {
  return <hr className="divider" />;
}

function Skeleton({ h = 40, mb = 8 }) {
  return <div className="skeleton" style={{ height: h, marginBottom: mb }} />;
}

function WizardStepper({ currentStep }) {
  return (
    <div className="wizard-stepper">
      {STEP_META.map((step, i) => {
        const stepNumber = i + 1;
        const isDone = stepNumber < currentStep;
        const isActive = stepNumber === currentStep;
        const lineState = stepNumber < currentStep ? "done" : stepNumber === currentStep ? "active" : "";

        return (
          <div className="wizard-step" key={step.key}>
            <div className="wizard-step-top">
              {i < STEP_META.length - 1 && (
                <div className={`wizard-line ${lineState}`} />
              )}

              <div
                className={`wizard-circle ${isDone ? "done" : isActive ? "active" : "todo"}`}
                title={step.label}
              >
                {isDone ? (
                  <i className="bi bi-check-lg wizard-step-icon" />
                ) : (
                  <i className={`bi ${step.icon} wizard-step-icon`} />
                )}
              </div>
            </div>

            <div className={`wizard-label ${isDone ? "done" : isActive ? "active" : "todo"}`}>
              {step.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StepSection({ stepNumber, title, subtitle, children }) {
  return (
    <div className="wizard-panel">
      <div className="step-card-head">
        <div className="step-badge">{stepNumber}</div>
        <div>
          <div className="step-heading">{title}</div>
          <div className="step-subheading">{subtitle}</div>
        </div>
      </div>
      <div className="step-body">{children}</div>
    </div>
  );
}

function PersonnelPicker({ value, onChange, deptUsers }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);

  const formatRoleLabel = (role = "") => {
    const value = String(role || "").trim();
    if (!value) return "Staff";

    return value
      .replaceAll("_", " ")
      .replaceAll("-", " ")
      .split(" ")
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  };

  const selectedNames = splitLines(value);

  useEffect(() => {
    function handle(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  if (!deptUsers || deptUsers.length === 0) {
    return (
      <FocusTextarea
        rows={2}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={`e.g. Mr. A. Limpin
Mr. K.J Adonis (one per line)`}
      />
    );
  }

  const filtered = deptUsers.filter(u => u.name.toLowerCase().includes(query.toLowerCase()));

  const toggle = (name) => {
    const next = selectedNames.includes(name)
      ? selectedNames.filter(n => n !== name)
      : [...selectedNames, name];
    onChange(next.join("\n"));
  };

  const roleColor = (role) => {
    const value = String(role || "").trim().toLowerCase();

    return ({
      supervisor: { background: "var(--sp-primary-soft)", color: "var(--sp-primary)" },
      staff: { background: "var(--sp-green-soft)", color: "var(--sp-green)" },
      admin: { background: "var(--sp-primary-soft)", color: "var(--sp-primary)" },
      president: { background: "#eef3ff", color: "#315bdc" },
      executive_director: { background: "var(--sp-muted-bg)", color: "var(--sp-muted)" },
    }[value] ?? { background: "var(--sp-muted-bg)", color: "var(--sp-muted)" });
  };

  return (
    <div ref={rootRef} className="personnel-picker">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(o => !o);
          }
        }}
        className={`inp personnel-trigger${open ? " open" : ""}`}
      >
        {selectedNames.length === 0 ? (
          <span className="personnel-placeholder">Click to select personnel…</span>
        ) : selectedNames.map(name => (
          <span key={name} className="tag tag-blue">
            {name}
            <span
              className="personnel-remove"
              onClick={e => { e.stopPropagation(); toggle(name); }}
              role="button"
              aria-label={`Remove ${name}`}
            >×</span>
          </span>
        ))}
        <span className="personnel-caret">
          <i className={`bi ${open ? "bi-chevron-up" : "bi-chevron-down"}`} />
        </span>
      </div>

      {open && (
        <div className="personnel-menu">
          <div className="personnel-menu-search">
            <input
              autoFocus
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="inp"
            />
          </div>

          <div className="personnel-options">
            {filtered.length === 0 ? (
              <div className="personnel-empty">No users found</div>
            ) : filtered.map(u => {
              const selected = selectedNames.includes(u.name);
              const rc = roleColor(u.role);

              return (
                <div
                  key={u.id}
                  onClick={() => toggle(u.name)}
                  className={`personnel-option${selected ? " is-selected" : ""}`}
                >
                  <div className="personnel-check">
                    {selected && <i className="bi bi-check" style={{ fontSize: 12 }} />}
                  </div>
                  <span className="personnel-name">{u.name}</span>
                  <span className="tag personnel-role-pill" style={{ ...rc, fontSize: 11 }}>
                    {formatRoleLabel(u.role)}
                  </span>
                </div>
              );
            })}
          </div>

          {selectedNames.length > 0 && (
            <div className="personnel-footer">
              <span className="tag tag-blue">{selectedNames.length} selected</span>
              <button type="button" className="personnel-clear" onClick={() => onChange("")}>
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlanStep({ value, index, onUpdate, onRemove, canRemove }) {
  return (
    <div className="plan-step-row">
      <div className="plan-step-number">{index + 1}</div>
      <FocusInput
        type="text"
        value={value}
        onChange={e => onUpdate(index, e.target.value)}
        placeholder={`Step ${index + 1}…`}
        style={{ flex: 1 }}
      />
      {canRemove && (
        <button type="button" onClick={() => onRemove(index)} className="btn-danger-lite" title="Remove step">
          <i className="bi bi-x-lg" />
        </button>
      )}
    </div>
  );
}

function GoalCard({ goal, index, onRemove, onUpdate, onAddPlan, onRemovePlan, onUpdatePlan, deptUsers }) {
  const [open, setOpen] = useState(index === 0);
  const planCount = goal.plans.filter(p => p.trim()).length;
  const personCount = splitLines(goal.personnel).length;

  return (
    <div className="goal-card">
      <button type="button" className={`goal-header${open ? " open" : ""}`} onClick={() => setOpen(o => !o)}>
        <div className="goal-summary-left">
          <div className="goal-number">{index + 1}</div>
          <div style={{ minWidth: 0 }}>
            <div className="goal-title-text">
              {goal.goal || <span className="goal-empty-title">Untitled Goal</span>}
            </div>
            <div className="goal-meta">
              {planCount > 0 && (
                <span className="tag tag-muted">
                  <i className="bi bi-list-check" />
                  {planCount} step{planCount !== 1 ? "s" : ""}
                </span>
              )}
              {personCount > 0 && (
                <span className="tag tag-blue">
                  <i className="bi bi-people-fill" />
                  {personCount} assigned
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="goal-header-actions">
          <span
            role="button"
            tabIndex={0}
            className="btn-danger-lite"
            onClick={e => { e.stopPropagation(); onRemove(goal.id); }}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onRemove(goal.id);
              }
            }}
          >
            Remove
          </span>
          <span className="goal-chevron"><i className="bi bi-chevron-down" /></span>
        </div>
      </button>

      {open && (
        <div className="goal-body">
          <div className="form-grid-2">
            <Field label="Goal Title" required>
              <FocusInput
                type="text"
                value={goal.goal}
                onChange={e => onUpdate(goal.id, "goal", e.target.value)}
                placeholder="e.g. Improve the Procurement System"
              />
            </Field>

            <Field label="Objectives" hint="Each line becomes a numbered objective in the document.">
              <FocusTextarea
                rows={3}
                value={goal.objectives}
                onChange={e => onUpdate(goal.id, "objectives", e.target.value)}
                placeholder={`Objective 1
Objective 2
Objective 3…`}
              />
            </Field>
          </div>

          <Divider />

          <Field label="Detailed Plan Steps" required>
            {goal.plans.map((p, pi) => (
              <PlanStep
                key={pi}
                value={p}
                index={pi}
                onUpdate={(idx, val) => onUpdatePlan(goal.id, idx, val)}
                onRemove={idx => onRemovePlan(goal.id, idx)}
                canRemove={goal.plans.length > 1}
              />
            ))}
            <button type="button" className="btn-add" onClick={() => onAddPlan(goal.id)} style={{ marginTop: 6 }}>
              <i className="bi bi-plus-lg" /> Add Step
            </button>
          </Field>

          <Divider />

          <div className="form-grid-2">
            <Field label="Specific Timeline">
              <FocusInput
                type="text"
                value={goal.timeline}
                onChange={e => onUpdate(goal.id, "timeline", e.target.value)}
                placeholder="e.g. March 15, 2026"
              />
            </Field>

            <Field
              label="Lead Personnel"
              hint={deptUsers.length > 0 ? "Select from your department" : "Enter names one per line"}
            >
              <PersonnelPicker
                value={goal.personnel}
                onChange={val => onUpdate(goal.id, "personnel", val)}
                deptUsers={deptUsers}
              />
            </Field>
          </div>

          <div className="form-grid-2">
            <Field label="Metric for Success">
              <FocusTextarea
                rows={2}
                value={goal.metric}
                onChange={e => onUpdate(goal.id, "metric", e.target.value)}
                placeholder="e.g. 30% faster processing time"
              />
            </Field>

            <Field label="Remarks / Evaluation">
              <FocusTextarea
                rows={2}
                value={goal.remarks}
                onChange={e => onUpdate(goal.id, "remarks", e.target.value)}
                placeholder="e.g. Done, Ongoing, Pending…"
              />
            </Field>
          </div>
        </div>
      )}
    </div>
  );
}

function PlanHistorySection({ deptPlans, loadingHistory, currentPlanId }) {
  const fmt = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="history-card">
      <div className="history-head">
        <div className="history-title">Department Plans</div>
        <div className="history-subtitle">
          {loadingHistory
            ? "Loading plans…"
            : `${deptPlans.length} plan${deptPlans.length !== 1 ? "s" : ""} from your department`}
        </div>
      </div>

      <div className="history-body">
        {loadingHistory ? (
          <div style={{ padding: 16 }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ marginBottom: 10 }}>
                <Skeleton h={12} mb={6} />
                <Skeleton h={10} mb={0} />
              </div>
            ))}
          </div>
        ) : deptPlans.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><i className="bi bi-inbox" /></div>
            No other plans found for your department yet.
          </div>
        ) : deptPlans.map(plan => {
          const isActive = plan.id === currentPlanId;
          return (
            <a
              key={plan.id}
              href={plan.preview_url || `strategic-plan-preview.php?id=${plan.id}`}
              className={`history-item${isActive ? " active" : ""}`}
            >
              <div className="history-item-title">
                {plan.plan_title || "Untitled Plan"}
                {isActive && <span className="tag tag-blue" style={{ marginLeft: 6 }}>Current</span>}
              </div>
              {plan.vision && <div className="history-snippet">{plan.vision}</div>}
              <div className="history-meta-row">
                <div className="history-user">
                  <div className="history-avatar">{(plan.creator_name || "?")[0].toUpperCase()}</div>
                  <span className="history-creator">{plan.creator_name || "Unknown"}</span>
                </div>
                <span className="history-date">{fmt(plan.updated_at || plan.created_at)}</span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function StrategicPlanGenerator() {
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [planTitle, setPlanTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [preparedBy, setPreparedBy] = useState("");
  const [preparedByTitle, setPreparedByTitle] = useState("");
  const [vision, setVision] = useState("");
  const [mission, setMission] = useState("");
  const [goals, setGoals] = useState([]);
  const [deptUsers, setDeptUsers] = useState([]);
  const [deptPlans, setDeptPlans] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notedByExecDir, setNotedByExecDir] = useState("");
  const [notedByPresident, setNotedByPresident] = useState("");
  const [activeStep, setActiveStep] = useState(1);

  const showToast = useCallback((message, type = "success") => {
    fireSileoToast(message, type).catch(error => {
      console.error("Sileo toast failed:", error);
    });
  }, []);

  useEffect(() => {
    const url = URL_PLAN_ID > 0
      ? `php/strategic_plan.php?plan_id=${URL_PLAN_ID}`
      : "php/strategic_plan.php";

    fetch(url, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then(r => {
        if (!r.ok) throw new Error(`Server returned ${r.status}`);
        return r.json();
      })
      .then(data => {
        if (data.error) throw new Error(data.error);

        setDeptUsers(data.dept_users ?? []);

        const allUsers = data.all_users ?? [];
        const execDir = allUsers.find(u => u.role === "executive_director");
        const president = allUsers.find(u => u.role === "president");

        if (execDir) setNotedByExecDir(execDir.name);
        if (president) setNotedByPresident(president.name);

        if (data.plan) {
          const p = data.plan;
          setPlanTitle(p.plan_title ?? "");
          setDepartment(p.department ?? "");
          setPreparedBy(p.prepared_by ?? "");
          setPreparedByTitle(p.prepared_by_title ?? "");
          setVision(p.vision ?? "");
          setMission(p.mission ?? "");

          if (p.noted_by_exec_dir) setNotedByExecDir(p.noted_by_exec_dir);
          if (p.noted_by_president) setNotedByPresident(p.noted_by_president);

          const loadedGoals = (data.goals ?? []).map(g => makeGoal({
            dbId: g.id,
            goal: g.goal ?? "",
            objectives: g.objectives ?? "",
            plans: g.plans?.length ? g.plans : [""],
            timeline: g.timeline ?? "",
            personnel: g.personnel ?? "",
            metric: g.metric ?? "",
            remarks: g.remarks ?? "",
          }));

          setGoals(loadedGoals.length ? loadedGoals : [makeGoal()]);
          setIsEdit(true);
          showToast("Plan loaded — ready to edit.", "info");
        } else {
          const cu = data.current_user;
          if (cu?.name) setPreparedBy(cu.name);
          if (cu?.department) setDepartment(cu.department);
          if (cu?.position) setPreparedByTitle(cu.position);
          setGoals([makeGoal()]);
        }

        setLoading(false);

        fetch("php/strategic_plan_history.php", {
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        })
          .then(r => r.ok ? r.json() : Promise.reject(new Error(`${r.status}`)))
          .then(histData => setDeptPlans(histData.plans ?? []))
          .catch(err => console.warn("Could not load plan history:", err.message))
          .finally(() => setLoadingHistory(false));
      })
      .catch(err => {
        console.error(err);
        setLoadErr(err.message);
        setLoading(false);
        setLoadingHistory(false);
      });
  }, [showToast]);

  const addGoal = () => setGoals(prev => [...prev, makeGoal()]);
  const removeGoal = id => setGoals(prev => prev.filter(g => g.id !== id));
  const updateGoal = (id, field, value) => setGoals(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  const addPlan = goalId => setGoals(prev => prev.map(g => g.id === goalId ? { ...g, plans: [...g.plans, ""] } : g));
  const removePlan = (goalId, idx) => setGoals(prev => prev.map(g => g.id === goalId && g.plans.length > 1 ? { ...g, plans: g.plans.filter((_, i) => i !== idx) } : g));
  const updatePlan = (goalId, idx, value) => setGoals(prev => prev.map(g => g.id === goalId ? { ...g, plans: g.plans.map((p, i) => i === idx ? value : p) } : g));

  const validateCurrentStep = () => {
    if (activeStep === 1 && (!planTitle.trim() || !department.trim() || !preparedBy.trim())) {
      showToast("Please complete all required fields in Document Info.", "error");
      return false;
    }

    if (activeStep === 2 && (!vision.trim() || !mission.trim())) {
      showToast("Please complete Vision and Mission.", "error");
      return false;
    }

    if (activeStep === 3) {
      if (goals.length === 0) {
        showToast("Add at least one goal.", "error");
        return false;
      }
      if (goals.some(g => !g.goal.trim())) {
        showToast("Every goal needs a title.", "error");
        return false;
      }
      if (goals.some(g => g.plans.filter(p => p.trim()).length === 0)) {
        showToast("Every goal needs at least one plan step.", "error");
        return false;
      }
    }

    if (activeStep === 4 && (!notedByExecDir.trim() || !notedByPresident.trim())) {
      showToast("Please complete the Noted By section.", "error");
      return false;
    }

    return true;
  };

  const goNext = () => {
    if (!validateCurrentStep()) return;
    setActiveStep(prev => Math.min(prev + 1, STEP_META.length));
  };

  const goPrev = () => setActiveStep(prev => Math.max(prev - 1, 1));

  const savePlan = async () => {
    if (!planTitle.trim() || !department.trim() || !vision.trim() || !mission.trim() || !preparedBy.trim() || !notedByExecDir.trim() || !notedByPresident.trim()) {
      showToast("Please fill in all required fields.", "error");
      return;
    }

    if (goals.length === 0) {
      showToast("Add at least one goal.", "error");
      return;
    }

    if (goals.some(g => !g.goal.trim())) {
      showToast("Every goal needs a title.", "error");
      return;
    }

    if (goals.some(g => g.plans.filter(p => p.trim()).length === 0)) {
      showToast("Every goal needs at least one plan step.", "error");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        plan_title: planTitle.trim(),
        department: department.trim(),
        vision: vision.trim(),
        mission: mission.trim(),
        prepared_by: preparedBy.trim(),
        prepared_by_title: preparedByTitle.trim(),
        noted_by_exec_dir: notedByExecDir.trim(),
        noted_by_president: notedByPresident.trim(),
        ...(URL_PLAN_ID > 0 ? { plan_id: URL_PLAN_ID } : {}),
        goals: goals.map(g => ({
          db_id: g.dbId ?? null,
          goal: g.goal.trim(),
          objectives: g.objectives.trim(),
          plans: g.plans.filter(p => p.trim()),
          timeline: g.timeline.trim(),
          personnel: g.personnel.trim(),
          metric: g.metric.trim(),
          remarks: g.remarks.trim(),
        })),
      };

      const res = await fetch("php/save_strategic_plan.php", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      showToast("Plan saved. Redirecting to preview…", "success");
      setTimeout(() => {
        window.location.href = data.redirect;
      }, 900);
    } catch (err) {
      console.error(err);
      showToast(`Save failed: ${err.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  const renderStepContent = () => {
    if (activeStep === 1) {
      return (
        <StepSection stepNumber="1" title="Document Info" subtitle="Title, department, and the person who prepared this plan">
          <div className="form-grid-2" style={{ marginBottom: 22 }}>
            <Field label="Plan Title" required>
              <FocusInput type="text" value={planTitle} onChange={e => setPlanTitle(e.target.value)} placeholder="e.g. Strategic Plan 2026" />
            </Field>
            <Field label="Department / Unit" required>
              <FocusInput type="text" value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Management Information System" />
            </Field>
          </div>

          <div className="form-grid-2">
            <Field label="Prepared By" required>
              <FocusInput type="text" value={preparedBy} onChange={e => setPreparedBy(e.target.value)} placeholder="Full name" />
            </Field>
            <Field label="Title / Position">
              <FocusInput type="text" value={preparedByTitle} onChange={e => setPreparedByTitle(e.target.value)} placeholder="e.g. M.I.S Coordinator" />
            </Field>
          </div>
        </StepSection>
      );
    }

    if (activeStep === 2) {
      return (
        <StepSection stepNumber="2" title="Vision & Mission" subtitle="Defines the purpose and direction of the department">
          <div className="form-grid-2">
            <Field label="Vision" required>
              <FocusTextarea rows={4} value={vision} onChange={e => setVision(e.target.value)} placeholder="Where the department wants to be in the future…" />
            </Field>
            <Field label="Mission" required>
              <FocusTextarea rows={4} value={mission} onChange={e => setMission(e.target.value)} placeholder="What the department does and how it serves the organization…" />
            </Field>
          </div>
        </StepSection>
      );
    }

    if (activeStep === 3) {
      return (
        <StepSection stepNumber="3" title="Strategic Goals" subtitle="Add and manage goals, steps, timelines, and personnel">
          {deptUsers.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <span className="tag tag-green">
                <i className="bi bi-people" />
                {deptUsers.length} dept. user{deptUsers.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {goals.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon"><i className="bi bi-bullseye" /></div>
              No goals yet. Click <strong>Add Goal</strong> below to start.
            </div>
          ) : (
            <div className="goals-stack">
              {goals.map((g, i) => (
                <GoalCard
                  key={g.id}
                  goal={g}
                  index={i}
                  deptUsers={deptUsers}
                  onRemove={removeGoal}
                  onUpdate={updateGoal}
                  onAddPlan={addPlan}
                  onRemovePlan={removePlan}
                  onUpdatePlan={updatePlan}
                />
              ))}
            </div>
          )}

          <div style={{ marginTop: 18 }}>
            <button type="button" className="btn-add" onClick={addGoal}>
              <i className="bi bi-plus-lg" /> Add {goals.length > 0 ? "Another " : ""}Goal
            </button>
          </div>
        </StepSection>
      );
    }

    return (
      <StepSection stepNumber="4" title="Noted By" subtitle="Authorized signatories who have reviewed and noted this plan">
        <div className="form-grid-2">
          <Field label="Executive Director" required>
            <FocusInput type="text" value={notedByExecDir} onChange={e => setNotedByExecDir(e.target.value)} placeholder="Executive Director name" />
            <div className="field-hint">Executive Director</div>
          </Field>
          <Field label="President" required>
            <FocusInput type="text" value={notedByPresident} onChange={e => setNotedByPresident(e.target.value)} placeholder="President name" />
            <div className="field-hint">President, RPsy, CSAP, PhD</div>
          </Field>
        </div>
      </StepSection>
    );
  };

  if (loading) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <div className="page-shell">
          <div className="loading-card">
            <Skeleton h={24} mb={10} />
            <Skeleton h={14} mb={18} />
            <Skeleton h={54} mb={18} />
            <Skeleton h={160} mb={0} />
          </div>
        </div>
      </>
    );
  }

  if (loadErr) {
    return (
      <>
        <style>{GLOBAL_CSS}</style>
        <div className="sp-error-box">
          <strong>Could not load plan data:</strong> {loadErr}
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

      <div className="page-shell">
        <div className="page-grid">
          <div className="wizard-shell">
            <div className="wizard-topbar">
              <h1 className="wizard-title">{isEdit ? "Edit Strategic Plan" : "Create Strategic Plan"}</h1>
              <p className="wizard-subtitle">
                {isEdit
                  ? "Update your strategic plan details below. Content and saving behavior remain unchanged."
                  : "Complete each step below, then save your strategic plan."}
              </p>
            </div>

            <div className="wizard-stepper-wrap">
              <WizardStepper currentStep={activeStep} />
            </div>

            {renderStepContent()}

            <div className="wizard-actions">
              <button type="button" className="btn-secondary" onClick={goPrev} disabled={activeStep === 1}>
                <i className="bi bi-arrow-left" /> Previous
              </button>

              {activeStep < STEP_META.length ? (
                <button type="button" className="btn-primary" onClick={goNext}>
                  Next <i className="bi bi-arrow-right" />
                </button>
              ) : (
                <button type="button" className="btn-primary" onClick={savePlan} disabled={saving}>
                  {saving ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="save-spinner" /> Saving...
                    </span>
                  ) : (
                    <>
                      {isEdit ? "Update Strategic Plan" : "Save Strategic Plan"} <i className="bi bi-arrow-right" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          <PlanHistorySection
            deptPlans={deptPlans}
            loadingHistory={loadingHistory}
            currentPlanId={URL_PLAN_ID}
          />
        </div>
      </div>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<StrategicPlanGenerator />);
