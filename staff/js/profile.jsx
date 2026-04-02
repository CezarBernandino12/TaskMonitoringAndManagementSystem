import React from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";

function getInitials(name) {
    if (!name) return "U";

    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";

    return parts
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("");
}

async function parseJsonResponse(response) {
    const rawText = await response.text();

    try {
        return JSON.parse(rawText);
    } catch (error) {
        console.error("Invalid JSON response:", rawText);
        throw new Error("Server returned invalid JSON.");
    }
}

function parseYMD(value) {
    if (!value) return null;

    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;

    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatYMD(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function isSameDay(a, b) {
    return (
        a &&
        b &&
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

function isFutureYMD(value) {
    const parsed = parseYMD(value);
    if (!parsed) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return parsed > today;
}

function formatCalendarMonth(date) {
    return date.toLocaleString("en-US", { month: "short" });
}

function formatReadableDate(value) {
    const date = parseYMD(value);
    if (!date) return "";

    return date.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
    });
}

function sanitizePhilippineMobileInput(value) {
    let digits = String(value || "").replace(/\D/g, "");

    if (digits.startsWith("63")) {
        digits = digits.slice(2);
    }

    if (digits.startsWith("0")) {
        digits = digits.slice(1);
    }

    return digits.slice(0, 10);
}

function getPhilippineLocalNumber(value) {
    return sanitizePhilippineMobileInput(value);
}

function normalizePhilippineNumberForSave(value) {
    const local = sanitizePhilippineMobileInput(value);
    return local ? `+63${local}` : "";
}

function formatPhilippineNumberDisplay(value) {
    const local = sanitizePhilippineMobileInput(value);

    if (!local) return "—";
    if (local.length <= 3) return `+63 ${local}`;
    if (local.length <= 6) return `+63 ${local.slice(0, 3)} ${local.slice(3)}`;
    return `+63 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6, 10)}`;
}

function isValidPhilippineMobile(value) {
    return /^9\d{9}$/.test(sanitizePhilippineMobileInput(value));
}

function getYearOptions(centerYear) {
    const startYear = 1950;
    const endYear = new Date().getFullYear();
    const years = [];

    for (let year = endYear; year >= startYear; year -= 1) {
        years.push(year);
    }

    if (!years.includes(centerYear)) {
        years.unshift(centerYear);
    }

    return years;
}

function getCalendarDays(viewDate) {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const mondayIndex = (firstOfMonth.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - mondayIndex);

    return Array.from({ length: 42 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return date;
    });
}

function mapProfileToForm(data) {
    return {
        full_name: data.name || "",
        nickname: data.nickname || "",
        email: data.email || "",
        contact: getPhilippineLocalNumber(data.contact),
        address: data.address || "",
        gender: data.gender || "",
        date_of_birth: data.date_of_birth || ""
    };
}

function ProfileEditorStyles() {
    return (
        <style>{`
            .profile-edit-shell {
                --profile-panel-bg: linear-gradient(
                    180deg,
                    color-mix(in srgb, var(--bs-body-bg) 92%, white 8%) 0%,
                    color-mix(in srgb, var(--bs-body-bg) 96%, black 4%) 100%
                );
                --profile-panel-border: color-mix(in srgb, var(--bs-border-color) 78%, transparent 22%);
                --profile-panel-shadow: 0 18px 40px rgba(15, 23, 42, 0.10);
                --profile-panel-inset: inset 0 1px 0 rgba(255,255,255,0.05);

                --profile-control-bg: color-mix(in srgb, var(--bs-body-bg) 88%, var(--bs-tertiary-bg) 12%);
                --profile-control-bg-hover: color-mix(in srgb, var(--bs-body-bg) 82%, var(--bs-tertiary-bg) 18%);
                --profile-control-bg-focus: color-mix(in srgb, var(--bs-body-bg) 90%, white 10%);
                --profile-control-border: color-mix(in srgb, var(--bs-border-color) 80%, transparent 20%);
                --profile-control-border-hover: color-mix(in srgb, var(--bs-border-color) 100%, var(--bs-body-color) 18%);
                --profile-control-border-focus: color-mix(in srgb, var(--bs-primary) 38%, var(--bs-border-color) 62%);
                --profile-control-text: var(--bs-body-color);
                --profile-control-placeholder: var(--bs-secondary-color);

                --profile-prefix-bg: color-mix(in srgb, var(--bs-tertiary-bg) 78%, var(--bs-body-bg) 22%);
                --profile-popup-bg: color-mix(in srgb, var(--bs-body-bg) 94%, var(--bs-tertiary-bg) 6%);
                --profile-muted: var(--bs-secondary-color);
                --profile-soft-hover: color-mix(in srgb, var(--bs-body-color) 8%, transparent 92%);
                --profile-soft-selected: color-mix(in srgb, var(--bs-primary) 12%, transparent 88%);
                --profile-selected-text: var(--bs-primary);
                --profile-today: #ef4444;
            }

            [data-bs-theme="dark"] .profile-edit-shell {
                --profile-panel-bg: linear-gradient(180deg, rgba(20, 25, 34, 0.96) 0%, rgba(15, 20, 28, 0.98) 100%);
                --profile-panel-border: rgba(255,255,255,0.08);
                --profile-panel-shadow: 0 24px 48px rgba(0,0,0,0.28);
                --profile-panel-inset: inset 0 1px 0 rgba(255,255,255,0.04);

                --profile-control-bg: rgba(255,255,255,0.04);
                --profile-control-bg-hover: rgba(255,255,255,0.06);
                --profile-control-bg-focus: rgba(255,255,255,0.08);
                --profile-control-border: rgba(255,255,255,0.10);
                --profile-control-border-hover: rgba(255,255,255,0.18);
                --profile-control-border-focus: rgba(110,168,254,0.55);
                --profile-control-text: #f8f9fa;
                --profile-control-placeholder: rgba(255,255,255,0.45);

                --profile-prefix-bg: rgba(255,255,255,0.05);
                --profile-popup-bg: rgba(18, 23, 32, 0.98);
                --profile-muted: rgba(255,255,255,0.68);
                --profile-soft-hover: rgba(255,255,255,0.08);
                --profile-soft-selected: rgba(110,168,254,0.18);
                --profile-selected-text: #9ec5fe;
            }

            .profile-edit-panel {
                background: var(--profile-panel-bg);
                border: 1px solid var(--profile-panel-border);
                border-radius: 24px;
                box-shadow: var(--profile-panel-shadow), var(--profile-panel-inset);
            }

            .profile-field-label,
            .profile-edit-panel .form-label {
                font-size: 12px;
                font-weight: 700;
                letter-spacing: 0.03em;
                color: var(--profile-muted);
                margin-bottom: 10px;
            }

            .profile-form-control,
            .profile-form-textarea,
            .profile-picker-trigger,
            .profile-select-trigger {
                width: 100%;
                max-width: none;
                border: 1px solid var(--profile-control-border) !important;
                border-radius: 16px !important;
                background: var(--profile-control-bg) !important;
                color: var(--profile-control-text) !important;
                box-shadow:
                    inset 0 1px 0 rgba(255,255,255,0.03),
                    0 1px 2px rgba(0,0,0,0.10);
                transition:
                    border-color 0.22s ease,
                    box-shadow 0.22s ease,
                    background-color 0.22s ease,
                    transform 0.16s ease;
            }

            .profile-form-control,
            .profile-picker-trigger,
            .profile-select-trigger {
                min-height: 48px;
                padding: 0 18px !important;
                font-size: 15px;
                font-weight: 500;
                line-height: 1.2;
            }

            .profile-form-textarea {
                min-height: 140px;
                padding: 16px 18px !important;
                font-size: 15px;
                line-height: 1.65;
                resize: vertical;
            }

            .profile-form-control::placeholder,
            .profile-form-textarea::placeholder,
            .profile-phone-input::placeholder {
                color: var(--profile-control-placeholder);
                font-weight: 400;
            }

            .profile-form-control:hover,
            .profile-form-textarea:hover,
            .profile-picker-trigger:hover,
            .profile-select-trigger:hover {
                border-color: var(--profile-control-border-hover) !important;
                background: var(--profile-control-bg-hover) !important;
                box-shadow:
                    inset 0 1px 0 rgba(255,255,255,0.04),
                    0 4px 12px rgba(0,0,0,0.12);
            }

            .profile-form-control:focus,
            .profile-form-control:focus-visible,
            .profile-form-textarea:focus,
            .profile-form-textarea:focus-visible,
            .profile-picker-trigger:focus-visible,
            .profile-select-trigger:focus-visible {
                outline: none !important;
                border-color: var(--profile-control-border-focus) !important;
                background: var(--profile-control-bg-focus) !important;
                box-shadow:
                    0 0 0 4px color-mix(in srgb, var(--bs-primary) 18%, transparent 82%),
                    0 10px 24px rgba(0,0,0,0.14),
                    inset 0 1px 0 rgba(255,255,255,0.04) !important;
            }

            .profile-form-control:disabled,
            .profile-form-textarea:disabled {
                background: color-mix(in srgb, var(--bs-body-bg) 84%, var(--bs-secondary-bg) 16%) !important;
                color: var(--profile-muted) !important;
                cursor: not-allowed;
            }

            .profile-phone-field {
                display: flex;
                align-items: stretch;
                width: 100%;
                max-width: none;
                min-height: 48px;
                border: 1px solid var(--profile-control-border);
                border-radius: 18px;
                background: var(--profile-control-bg);
                box-shadow:
                    inset 0 1px 0 rgba(255,255,255,0.03),
                    0 1px 2px rgba(0,0,0,0.10);
                transition: border-color 0.22s ease, box-shadow 0.22s ease, background-color 0.22s ease;
                overflow: hidden;
            }

            .profile-phone-field:hover {
                border-color: var(--profile-control-border-hover);
                background: var(--profile-control-bg-hover);
                box-shadow:
                    inset 0 1px 0 rgba(255,255,255,0.04),
                    0 4px 12px rgba(0,0,0,0.12);
            }

            .profile-phone-field:focus-within {
                border-color: var(--profile-control-border-focus);
                background: var(--profile-control-bg-focus);
                box-shadow:
                    0 0 0 4px color-mix(in srgb, var(--bs-primary) 18%, transparent 82%),
                    0 10px 24px rgba(0,0,0,0.14),
                    inset 0 1px 0 rgba(255,255,255,0.04);
            }

            .profile-phone-prefix {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                padding: 0 16px;
                background: var(--profile-prefix-bg);
                border-right: 1px solid var(--profile-control-border);
                color: var(--profile-control-text);
                font-weight: 700;
                flex-shrink: 0;
            }

            .profile-phone-flag {
                width: 20px;
                height: 14px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }

            .profile-phone-code {
                font-size: 15px;
                letter-spacing: 0.01em;
            }

            .profile-phone-input {
                flex: 1;
                width: 100%;
                min-height: 48px;
                border: 0 !important;
                outline: 0 !important;
                background: transparent !important;
                box-shadow: none !important;
                padding: 0 16px !important;
                font-size: 15px;
                font-weight: 500;
                color: var(--profile-control-text);
            }

            .profile-phone-input:focus,
            .profile-phone-input:focus-visible {
                outline: none !important;
                box-shadow: none !important;
            }

            .profile-picker-shell {
                position: relative;
                width: 100%;
                max-width: none;
            }

            .profile-picker-trigger,
            .profile-select-trigger {
                width: 100%;
                max-width: none;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 12px;
                text-align: left;
            }

            .profile-picker-trigger.is-empty,
            .profile-select-trigger.is-empty {
                color: var(--profile-control-placeholder);
                font-weight: 500;
            }

            .profile-picker-trigger i,
            .profile-select-trigger i {
                font-size: 12px;
                color: var(--profile-muted);
                transition: transform 0.2s ease, color 0.2s ease;
            }

            .profile-picker-trigger[aria-expanded="true"] i,
            .profile-select-trigger[aria-expanded="true"] i {
                transform: rotate(180deg);
                color: var(--profile-control-text);
            }

            .profile-picker-popup,
            .profile-select-popup {
                position: absolute;
                top: calc(100% + 10px);
                left: 0;
                z-index: 70;
                background: var(--profile-popup-bg);
                border: 1px solid var(--profile-control-border);
                border-radius: 20px;
                box-shadow: 0 24px 60px rgba(0,0,0,0.22);
                box-sizing: border-box;
                backdrop-filter: blur(10px);
            }

            .profile-picker-popup {
                width: min(320px, calc(100vw - 24px));
                padding: 14px 12px 10px;
                overflow: hidden;
            }

            .profile-select-popup {
                width: 100%;
                min-width: 220px;
                padding: 8px;
            }

            .profile-picker-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-bottom: 10px;
            }

            .profile-picker-title {
                position: relative;
                display: inline-flex;
                align-items: center;
                gap: 6px;
                font-size: 14px;
                font-weight: 700;
                color: var(--profile-control-text);
                letter-spacing: -0.01em;
            }

            .profile-picker-title-month {
                font-weight: 700;
            }

            .profile-picker-year-trigger {
                border: 0;
                background: transparent;
                padding: 0;
                display: inline-flex;
                align-items: center;
                gap: 4px;
                font: inherit;
                color: inherit;
                cursor: pointer;
            }

            .profile-picker-year-trigger i {
                font-size: 11px;
            }

            .profile-picker-year-menu {
                position: absolute;
                top: calc(100% + 8px);
                left: 0;
                z-index: 80;
                width: 110px;
                max-height: 220px;
                overflow-y: auto;
                margin-top: 10px;
                padding: 6px;
                background: var(--profile-popup-bg);
                border: 1px solid var(--profile-control-border);
                border-radius: 14px;
                box-shadow: 0 16px 34px rgba(0,0,0,0.20);
                scrollbar-width: none;
                -ms-overflow-style: none;
            }

            .profile-picker-year-menu::-webkit-scrollbar {
                width: 0;
                height: 0;
                display: none;
            }

            .profile-picker-year-option,
            .profile-select-option {
                width: 100%;
                border: 0;
                background: transparent;
                text-align: left;
                border-radius: 14px;
                color: var(--profile-control-text);
                transition: background 0.18s ease, color 0.18s ease;
            }

            .profile-picker-year-option {
                padding: 8px 10px;
                font-size: 13px;
                font-weight: 600;
            }

            .profile-select-option {
                padding: 12px 14px;
                font-size: 14px;
                font-weight: 600;
            }

            .profile-picker-year-option:hover,
            .profile-select-option:hover,
            .profile-picker-nav button:hover,
            .profile-picker-day:hover {
                background: var(--profile-soft-hover);
            }

            .profile-picker-year-option.is-selected,
            .profile-select-option.is-selected {
                background: var(--profile-soft-selected);
                color: var(--profile-selected-text);
            }

            .profile-picker-nav {
                display: flex;
                align-items: center;
                gap: 2px;
            }

            .profile-picker-nav button {
                width: 28px;
                height: 28px;
                border: 0;
                background: transparent;
                border-radius: 999px;
                color: var(--profile-control-text);
                font-size: 16px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                transition: background 0.2s ease, transform 0.2s ease;
            }

            .profile-picker-weekdays,
            .profile-picker-grid {
                display: grid;
                grid-template-columns: repeat(7, minmax(0, 1fr));
                width: 100%;
            }

            .profile-picker-weekdays {
                margin-bottom: 2px;
            }

            .profile-picker-weekday {
                text-align: center;
                font-size: 10px;
                font-weight: 600;
                color: var(--profile-muted);
                padding: 4px 0;
            }

            .profile-picker-day {
                position: relative;
                width: 34px;
                height: 34px;
                margin: 1px auto;
                border: 0;
                background: transparent;
                border-radius: 999px;
                font-size: 13px;
                font-weight: 500;
                color: var(--profile-control-text);
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
            }

            .profile-picker-day.is-outside {
                color: color-mix(in srgb, var(--profile-muted) 65%, transparent 35%);
            }

            .profile-picker-day.is-selected {
                color: var(--profile-selected-text);
                box-shadow: inset 0 0 0 2px currentColor;
                font-weight: 700;
                background: transparent;
            }

            .profile-picker-day.is-disabled {
                opacity: 0.4;
                cursor: not-allowed;
            }

            .profile-picker-day.is-today {
                color: var(--profile-today);
                font-weight: 700;
            }

            .profile-picker-day.is-today::after {
                content: "";
                position: absolute;
                bottom: 3px;
                width: 4px;
                height: 4px;
                border-radius: 50%;
                background: var(--profile-today);
            }

            .profile-edit-chip {
                display: inline-flex;
                align-items: center;
                gap: 10px;
                padding: 8px 12px;
                margin-bottom: 14px;
                border-radius: 999px;
                background: var(--profile-soft-hover);
                color: var(--profile-control-text);
                font-size: 13px;
                font-weight: 700;
                line-height: 1;
            }

            .profile-edit-chip i,
            .profile-label-with-icon i {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                line-height: 1;
                flex-shrink: 0;
            }

            .profile-edit-chip i {
                font-size: 14px;
            }

            .profile-label-with-icon {
                display: inline-flex;
                align-items: center;
                gap: 10px;
            }

            @media (max-width: 575.98px) {
                .profile-picker-popup {
                    width: min(320px, calc(100vw - 24px));
                }
            }
        `}</style>
    );
}

function Avatar({ src, name, size = 74 }) {
    if (src) {
        return (
            <img
                src={src}
                alt={name || "User"}
                className="rounded-circle border"
                style={{
                    width: size,
                    height: size,
                    objectFit: "cover",
                    flexShrink: 0
                }}
            />
        );
    }

    return (
        <div
            className="rounded-circle border d-inline-flex align-items-center justify-content-center fw-bold text-uppercase bg-secondary-subtle text-secondary-emphasis"
            style={{
                width: size,
                height: size,
                flexShrink: 0,
                fontSize: size >= 74 ? "1.35rem" : "1rem"
            }}
        >
            {getInitials(name)}
        </div>
    );
}

function InfoItem({ label, value, strong = true }) {
    return (
        <div>
            <div
                className="text-body-secondary"
                style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    marginBottom: "6px"
                }}
            >
                {label}
            </div>

            <div
                className={strong ? "fw-bold text-body" : "fw-semibold text-body"}
                style={{
                    fontSize: "16px",
                    lineHeight: 1.5,
                    wordBreak: "break-word",
                    overflowWrap: "anywhere"
                }}
            >
                {value || "—"}
            </div>
        </div>
    );
}

function CardSection({ title, onEdit, children, bodyClassName = "" }) {
    return (
        <div
            className="card border shadow-sm bg-body-tertiary h-100"
            style={{ borderRadius: "16px" }}
        >
            <div className={`card-body p-4 ${bodyClassName}`}>
                <div className="d-flex align-items-center justify-content-between gap-3">
                    <h6
                        className="mb-0 fw-bold text-body"
                        style={{ fontSize: "22px" }}
                    >
                        {title}
                    </h6>

                    {onEdit ? (
                        <button
                            type="button"
                            className="btn btn-sm p-0 border-0 bg-transparent text-secondary"
                            onClick={onEdit}
                            aria-label={`Edit ${title}`}
                            style={{
                                width: "34px",
                                height: "34px",
                                borderRadius: "8px"
                            }}
                        >
                            <i className="bi bi-pencil-fill"></i>
                        </button>
                    ) : null}
                </div>

                <div className="border-top mt-3 pt-4">{children}</div>
            </div>
        </div>
    );
}

function AlertMessage({ kind = "danger", children }) {
    return (
        <div className={`alert alert-${kind} mb-4`} role="alert">
            {children}
        </div>
    );
}

function CustomDatePicker({ value, onChange, name = "date_of_birth" }) {
    const [open, setOpen] = React.useState(false);
    const [yearMenuOpen, setYearMenuOpen] = React.useState(false);
    const selectedDate = parseYMD(value);
    const [viewDate, setViewDate] = React.useState(selectedDate || new Date());
    const rootRef = React.useRef(null);
    const popupId = React.useId();
    const yearMenuId = React.useId();
    const today = new Date();

    React.useEffect(() => {
        if (selectedDate) {
            setViewDate(selectedDate);
        }
    }, [selectedDate]);

    React.useEffect(() => {
        function handleOutside(event) {
            if (rootRef.current && !rootRef.current.contains(event.target)) {
                setOpen(false);
                setYearMenuOpen(false);
            }
        }

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                setOpen(false);
                setYearMenuOpen(false);
            }
        }

        document.addEventListener("mousedown", handleOutside);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handleOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    const days = React.useMemo(() => getCalendarDays(viewDate), [viewDate]);
    const years = React.useMemo(
        () => getYearOptions(viewDate.getFullYear()),
        [viewDate]
    );

    function pickDate(date) {
        if (date > today) return;

        onChange({
            target: {
                name,
                value: formatYMD(date)
            }
        });

        setOpen(false);
        setYearMenuOpen(false);
    }

    function changeYear(year) {
        setViewDate(new Date(year, viewDate.getMonth(), 1));
        setYearMenuOpen(false);
    }

    return (
        <div className="profile-picker-shell" ref={rootRef}>
            <button
                type="button"
                className={`profile-picker-trigger ${!value ? "is-empty" : ""}`}
                onClick={() => setOpen((current) => !current)}
                aria-expanded={open}
                aria-haspopup="dialog"
                aria-controls={popupId}
            >
                <span>{value ? formatReadableDate(value) : "Select date of birth"}</span>
                <i className="bi bi-chevron-down" aria-hidden="true"></i>
            </button>

            {open && (
                <div
                    id={popupId}
                    className="profile-picker-popup"
                    role="dialog"
                    aria-label="Choose date of birth"
                >
                    <div className="profile-picker-header">
                        <div className="profile-picker-title">
                            <span className="profile-picker-title-month">
                                {formatCalendarMonth(viewDate)}
                            </span>

                            <button
                                type="button"
                                className="profile-picker-year-trigger"
                                onClick={() => setYearMenuOpen((current) => !current)}
                                aria-expanded={yearMenuOpen}
                                aria-controls={yearMenuOpen ? yearMenuId : undefined}
                                aria-haspopup="listbox"
                            >
                                <span>{viewDate.getFullYear()}</span>
                                <i
                                    className={`bi ${yearMenuOpen ? "bi-chevron-up" : "bi-chevron-down"}`}
                                    aria-hidden="true"
                                ></i>
                            </button>

                            {yearMenuOpen && (
                                <div
                                    id={yearMenuId}
                                    className="profile-picker-year-menu"
                                    role="listbox"
                                    aria-label="Choose year"
                                >
                                    {years.map((year) => (
                                        <button
                                            key={year}
                                            type="button"
                                            role="option"
                                            aria-selected={year === viewDate.getFullYear()}
                                            className={`profile-picker-year-option ${
                                                year === viewDate.getFullYear() ? "is-selected" : ""
                                            }`}
                                            onClick={() => changeYear(year)}
                                        >
                                            {year}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="profile-picker-nav">
                            <button
                                type="button"
                                onClick={() =>
                                    setViewDate(
                                        new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1)
                                    )
                                }
                                aria-label="Previous month"
                            >
                                <i className="bi bi-chevron-left" aria-hidden="true"></i>
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setViewDate(
                                        new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1)
                                    )
                                }
                                aria-label="Next month"
                            >
                                <i className="bi bi-chevron-right" aria-hidden="true"></i>
                            </button>
                        </div>
                    </div>

                    <div className="profile-picker-weekdays">
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                            <div key={day} className="profile-picker-weekday">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="profile-picker-grid">
                        {days.map((day) => {
                            const isOutside = day.getMonth() !== viewDate.getMonth();
                            const selected = isSameDay(day, selectedDate);
                            const isTodayFlag = isSameDay(day, today);
                            const isDisabled = day > today;

                            return (
                                <button
                                    key={day.toISOString()}
                                    type="button"
                                    disabled={isDisabled}
                                    aria-disabled={isDisabled}
                                    className={[
                                        "profile-picker-day",
                                        isOutside ? "is-outside" : "",
                                        selected ? "is-selected" : "",
                                        !selected && isTodayFlag ? "is-today" : "",
                                        isDisabled ? "is-disabled" : ""
                                    ].join(" ").trim()}
                                    onClick={() => pickDate(day)}
                                >
                                    {day.getDate()}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function CustomGenderSelect({ value, onChange, name = "gender" }) {
    const [open, setOpen] = React.useState(false);
    const rootRef = React.useRef(null);
    const popupId = React.useId();

    const options = [
        { value: "Male", label: "Male" },
        { value: "Female", label: "Female" },
        { value: "Rather not say", label: "Rather not say" }
    ];

    React.useEffect(() => {
        function handleOutside(event) {
            if (rootRef.current && !rootRef.current.contains(event.target)) {
                setOpen(false);
            }
        }

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleOutside);
        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("mousedown", handleOutside);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    const currentLabel =
        options.find((option) => option.value === value)?.label || "Select gender";

    return (
        <div className="profile-picker-shell" ref={rootRef}>
            <button
                type="button"
                className={`profile-select-trigger ${!value ? "is-empty" : ""}`}
                onClick={() => setOpen((current) => !current)}
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-controls={popupId}
            >
                <span>{currentLabel}</span>
                <i className="bi bi-chevron-down" aria-hidden="true"></i>
            </button>

            {open && (
                <div
                    id={popupId}
                    className="profile-select-popup"
                    role="listbox"
                    aria-label="Choose gender"
                >
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            role="option"
                            aria-selected={value === option.value}
                            className={`profile-select-option ${
                                value === option.value ? "is-selected" : ""
                            }`}
                            onClick={() => {
                                onChange({
                                    target: {
                                        name,
                                        value: option.value
                                    }
                                });
                                setOpen(false);
                            }}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function ProfilePage() {
    const [profile, setProfile] = React.useState(null);
    const [form, setForm] = React.useState({
        full_name: "",
        nickname: "",
        email: "",
        contact: "",
        address: "",
        gender: "",
        date_of_birth: ""
    });
    const [loading, setLoading] = React.useState(true);
    const [saving, setSaving] = React.useState(false);
    const [pageError, setPageError] = React.useState("");
    const [selectedImage, setSelectedImage] = React.useState(null);
    const [previewUrl, setPreviewUrl] = React.useState("");
    const [removeImage, setRemoveImage] = React.useState(false);
    const [activeSection, setActiveSection] = React.useState(null);

    const fileInputRef = React.useRef(null);

    const hydrateForm = React.useCallback((data) => {
        setProfile(data);
        setForm(mapProfileToForm(data));
        setPreviewUrl(data.profile_image_url || "");
        setRemoveImage(false);
    }, []);

    const resetEditor = React.useCallback(
        (nextSection = null) => {
            if (profile) {
                hydrateForm(profile);
            }

            setSelectedImage(null);
            setRemoveImage(false);
            setPageError("");

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            setActiveSection(nextSection);
        },
        [profile, hydrateForm]
    );

    React.useEffect(() => {
        let mounted = true;

        async function loadProfile() {
            try {
                const response = await fetch("php/get_profile.php", {
                    credentials: "same-origin",
                    headers: {
                        Accept: "application/json"
                    }
                });

                const data = await parseJsonResponse(response);

                if (!response.ok || data.error) {
                    throw new Error(data.error || "Failed to load profile.");
                }

                if (!mounted) return;

                hydrateForm(data);
                setPageError("");
            } catch (error) {
                if (!mounted) return;
                setPageError(error.message || "Failed to load profile.");
            } finally {
                if (mounted) setLoading(false);
            }
        }

        loadProfile();

        return () => {
            mounted = false;
        };
    }, [hydrateForm]);

    React.useEffect(() => {
        if (!selectedImage) return undefined;

        const objectUrl = URL.createObjectURL(selectedImage);
        setPreviewUrl(objectUrl);

        return () => {
            URL.revokeObjectURL(objectUrl);
        };
    }, [selectedImage]);

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]:
                name === "contact"
                    ? sanitizePhilippineMobileInput(value)
                    : value
        }));
    }

    function handleStartEdit(section) {
        resetEditor(section);
    }

    function handleCancelEdit() {
        resetEditor(null);
    }

    function handleImageChange(event) {
        const file = event.target.files?.[0] || null;
        if (!file) return;

        const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
        const maxSize = 15 * 1024 * 1024;

        if (!allowedTypes.includes(file.type)) {
            setPageError("Please upload a PNG, JPEG, or WEBP image.");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        if (file.size > maxSize) {
            setPageError("Please upload an image under 15MB.");
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        setPageError("");
        setSelectedImage(file);
        setRemoveImage(false);
    }

    function handleRemoveImage() {
        if (!previewUrl && !selectedImage) {
            setPageError("There is no profile picture set yet.");
            return;
        }

        setPageError("");
        setSelectedImage(null);
        setPreviewUrl("");
        setRemoveImage(true);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setSaving(true);
        setPageError("");

        try {
            const fullName = form.full_name.trim();
            const email = form.email.trim();
            const nickname = form.nickname.trim();
            const address = form.address.trim();
            const normalizedContact = normalizePhilippineNumberForSave(form.contact);

            if (!fullName) {
                throw new Error("Full name is required.");
            }

            if (!email) {
                throw new Error("Email is required.");
            }

            if (form.contact && !isValidPhilippineMobile(form.contact)) {
                throw new Error("Please enter a valid Philippine mobile number starting with 9.");
            }

            if (form.date_of_birth && isFutureYMD(form.date_of_birth)) {
                throw new Error("Date of birth cannot be in the future.");
            }

            const formData = new FormData();
            formData.append("name", fullName);
            formData.append("nickname", nickname);
            formData.append("email", email);
            formData.append("contact", normalizedContact);
            formData.append("address", address);
            formData.append("gender", form.gender);
            formData.append("date_of_birth", form.date_of_birth);

            if (removeImage) {
                formData.append("remove_profile_image", "1");
            }

            if (selectedImage) {
                formData.append("profile_image", selectedImage);
            }

            const response = await fetch("php/update_profile.php", {
                method: "POST",
                body: formData,
                credentials: "same-origin"
            });

            const data = await parseJsonResponse(response);

            if (!response.ok || data.error) {
                throw new Error(data.error || "Failed to update profile.");
            }

            hydrateForm(data.profile);
            setSelectedImage(null);
            setRemoveImage(false);
            setActiveSection(null);
            setPageError("");

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            window.dispatchEvent(
                new CustomEvent("profile-updated", {
                    detail: data.profile
                })
            );
        } catch (error) {
            console.error(error);
            setPageError(error.message || "Something went wrong.");
        } finally {
            setSaving(false);
        }
    }

    const displayName = form.full_name.trim() || profile?.name || "User";
    const role = profile?.role || "—";
    const departmentName = profile?.department_name || "—";
    const employeeId = profile?.employee_id || "—";
    const departmentId = profile?.department_id || "—";
    const isEditing = activeSection !== null;

    const labelStyle = {
        fontSize: "12px",
        fontWeight: 700,
        letterSpacing: "0.03em",
        marginBottom: "10px",
        color: "var(--bs-secondary-color)"
    };

    const primaryButtonStyle = {
        minHeight: "48px",
        minWidth: "150px",
        borderRadius: "14px",
        paddingInline: "22px",
        boxShadow: "0 10px 22px rgba(0,0,0,0.10)"
    };

    const secondaryButtonStyle = {
        minHeight: "48px",
        borderRadius: "14px",
        paddingInline: "18px"
    };

    const softIconButtonStyle = {
        minHeight: "46px",
        borderRadius: "14px",
        paddingInline: "18px"
    };

    if (loading) {
        return (
            <div className="w-100 pb-4">
                <ProfileEditorStyles />
                <div
                    className="card border shadow-sm bg-body"
                    style={{ borderRadius: "20px" }}
                >
                    <div className="card-body py-5">
                        <div className="d-flex align-items-center justify-content-center gap-3 text-body-secondary">
                            <div
                                className="spinner-border spinner-border-sm"
                                role="status"
                                aria-hidden="true"
                            ></div>
                            <span>Loading profile...</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (pageError && !profile) {
        return (
            <div className="w-100 pb-4">
                <ProfileEditorStyles />
                <div
                    className="card border shadow-sm bg-body"
                    style={{ borderRadius: "20px" }}
                >
                    <div className="card-body p-4">
                        <AlertMessage>{pageError}</AlertMessage>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-100 pb-4">
            <ProfileEditorStyles />

            <div
                className="card border shadow-sm bg-body"
                style={{
                    borderRadius: "20px",
                    minHeight: "fit-content"
                }}
            >
                <div className="card-body p-4 p-xl-5">
                    <div className="mb-4">
                        {!isEditing ? (
                            <>
                                <h4
                                    className="mb-2 fw-bold text-body"
                                    style={{ fontSize: "28px" }}
                                >
                                    Account settings
                                </h4>

                                <p
                                    className="mb-0 text-body-secondary"
                                    style={{ fontSize: "15px", maxWidth: "760px" }}
                                >
                                    Preview your account details and edit them by section.
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="profile-edit-chip">
                                    <i
                                        className={`bi ${
                                            activeSection === "contact"
                                                ? "bi-envelope-paper"
                                                : "bi-person-vcard"
                                        }`}
                                        aria-hidden="true"
                                    ></i>

                                    <span>
                                        {activeSection === "contact"
                                            ? "Contact editor"
                                            : "Profile editor"}
                                    </span>
                                </div>

                                <h4
                                    className="mb-2 fw-bold text-body"
                                    style={{
                                        fontSize: "28px",
                                        letterSpacing: "-0.02em"
                                    }}
                                >
                                    {activeSection === "contact"
                                        ? "Update your contact details"
                                        : "Edit your personal information"}
                                </h4>

                                <p
                                    className="mb-0 text-body-secondary"
                                    style={{
                                        fontSize: "15px",
                                        maxWidth: "760px",
                                        lineHeight: 1.65
                                    }}
                                >
                                    {activeSection === "contact"
                                        ? "Keep your email and phone information updated so your account details stay accurate."
                                        : "Refine your personal details and profile photo with a cleaner, more polished editing experience."}
                                </p>
                            </>
                        )}
                    </div>

                    {pageError && profile ? <AlertMessage>{pageError}</AlertMessage> : null}

                    {!isEditing ? (
                        <>
                            <div
                                className="card border shadow-sm bg-body-tertiary mb-4"
                                style={{ borderRadius: "16px" }}
                            >
                                <div className="card-body px-4 py-3 px-xl-4 py-xl-3">
                                    <div className="row g-4 align-items-center">
                                        <div className="col-12 col-xl-5">
                                            <div
                                                className="d-flex align-items-center gap-3"
                                                style={{ minWidth: 0 }}
                                            >
                                                <Avatar
                                                    src={previewUrl}
                                                    name={displayName}
                                                    size={74}
                                                />

                                                <div style={{ minWidth: 0 }}>
                                                    <h5
                                                        className="mb-2 fw-bold text-body"
                                                        style={{
                                                            fontSize: "30px",
                                                            lineHeight: 1.15
                                                        }}
                                                    >
                                                        {displayName}
                                                    </h5>

                                                    <div
                                                        className="d-flex align-items-center flex-wrap gap-2 text-body-secondary"
                                                        style={{ fontSize: "15px", fontWeight: 500 }}
                                                    >
                                                        <span className="fw-bold text-info-emphasis">
                                                            {role}
                                                        </span>
                                                        <span className="text-body-secondary">|</span>
                                                        <span>{departmentName}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-auto d-none d-xl-flex justify-content-center">
                                            <div
                                                className="vr opacity-25"
                                                style={{ minHeight: "118px" }}
                                            ></div>
                                        </div>

                                        <div className="col-12 col-xl">
                                            <div className="row g-4">
                                                <div className="col-6">
                                                    <InfoItem label="Role" value={role} />
                                                </div>
                                                <div className="col-6">
                                                    <InfoItem label="Employee ID" value={employeeId} />
                                                </div>
                                                <div className="col-6">
                                                    <InfoItem label="Department" value={departmentName} />
                                                </div>
                                                <div className="col-6">
                                                    <InfoItem label="Department ID" value={departmentId} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="row g-3 align-items-stretch">
                                <div className="col-12 col-xl-7 col-xxl-6">
                                    <CardSection
                                        title="Personal information"
                                        onEdit={() => handleStartEdit("personal")}
                                    >
                                        <div className="row g-4">
                                            <div className="col-12 col-md-6">
                                                <InfoItem label="Full name" value={form.full_name} />
                                            </div>

                                            <div className="col-12 col-md-6">
                                                <InfoItem label="Nickname" value={form.nickname} />
                                            </div>

                                            <div className="col-12 col-md-6">
                                                <InfoItem
                                                    label="Date of birth"
                                                    value={formatReadableDate(form.date_of_birth) || "—"}
                                                />
                                            </div>

                                            <div className="col-12 col-md-6">
                                                <InfoItem label="Gender" value={form.gender} />
                                            </div>

                                            <div className="col-12">
                                                <InfoItem label="Address" value={form.address} />
                                            </div>
                                        </div>
                                    </CardSection>
                                </div>

                                <div className="col-12 col-xl-5 col-xxl-6">
                                    <div className="d-grid gap-3 h-100">
                                        <CardSection
                                            title="Contact information"
                                            onEdit={() => handleStartEdit("contact")}
                                        >
                                            <div className="row g-4">
                                                <div className="col-12 col-md-6">
                                                    <InfoItem
                                                        label="Contact number"
                                                        value={formatPhilippineNumberDisplay(form.contact)}
                                                    />
                                                </div>

                                                <div className="col-12 col-md-6">
                                                    <InfoItem label="Email" value={form.email} />
                                                </div>
                                            </div>
                                        </CardSection>

                                        <CardSection title="Account information">
                                            <div className="row g-4">
                                                <div className="col-12 col-md-6 col-xl-6">
                                                    <InfoItem label="Department" value={departmentName} />
                                                </div>

                                                <div className="col-12 col-md-6 col-xl-6">
                                                    <InfoItem label="Role" value={role} />
                                                </div>

                                                <div className="col-12 col-md-6 col-xl-6">
                                                    <InfoItem label="Employee ID" value={employeeId} />
                                                </div>

                                                <div className="col-12 col-md-6 col-xl-6">
                                                    <InfoItem label="Department ID" value={departmentId} />
                                                </div>
                                            </div>
                                        </CardSection>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <form onSubmit={handleSubmit} className="profile-edit-shell">
                            {activeSection === "personal" ? (
                                <>
                                    <div className="profile-edit-panel p-3 p-md-4 mb-4">
                                        <div className="d-flex flex-column flex-lg-row align-items-start align-items-lg-center justify-content-between gap-4">
                                            <div className="d-flex align-items-center gap-3">
                                                <Avatar
                                                    src={previewUrl}
                                                    name={displayName}
                                                    size={94}
                                                />

                                                <div>
                                                    <div
                                                        className="fw-bold text-body"
                                                        style={{ fontSize: "20px", lineHeight: 1.15 }}
                                                    >
                                                        {displayName}
                                                    </div>

                                                    <div
                                                        className="text-body-secondary mt-1"
                                                        style={{ fontSize: "14px" }}
                                                    >
                                                        Upload a polished profile image for a more professional account view.
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="d-flex flex-column flex-sm-row gap-2 flex-wrap">
                                                <input
                                                    ref={fileInputRef}
                                                    type="file"
                                                    accept="image/png,image/jpeg,image/webp"
                                                    className="d-none"
                                                    onChange={handleImageChange}
                                                />

                                                <button
                                                    type="button"
                                                    className="btn btn-dark fw-semibold d-inline-flex align-items-center gap-2"
                                                    style={softIconButtonStyle}
                                                    onClick={() => fileInputRef.current?.click()}
                                                >
                                                    <i className="bi bi-cloud-arrow-up" aria-hidden="true"></i>
                                                    Upload image
                                                </button>

                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger d-inline-flex align-items-center gap-2"
                                                    style={softIconButtonStyle}
                                                    onClick={handleRemoveImage}
                                                >
                                                    <i className="bi bi-trash3-fill" aria-hidden="true"></i>
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="profile-edit-panel p-3 p-md-4">
                                        <div className="row g-4">
                                            <div className="col-12 col-md-6">
                                                <label className="form-label text-body" style={labelStyle}>
                                                    Full name <span className="text-danger">*</span>
                                                </label>

                                                <input
                                                    type="text"
                                                    className="form-control profile-form-control"
                                                    name="full_name"
                                                    value={form.full_name}
                                                    onChange={handleChange}
                                                    required
                                                />
                                            </div>

                                            <div className="col-12 col-md-6">
                                                <label className="form-label text-body" style={labelStyle}>
                                                    Nickname
                                                </label>

                                                <input
                                                    type="text"
                                                    className="form-control profile-form-control"
                                                    name="nickname"
                                                    value={form.nickname}
                                                    onChange={handleChange}
                                                    placeholder="Enter nickname"
                                                />
                                            </div>

                                            <div className="col-12 col-md-6">
                                                <label
                                                    className="form-label text-body profile-label-with-icon"
                                                    style={labelStyle}
                                                >
                                                    <i
                                                        className="bi bi-calendar3 text-body-secondary"
                                                        aria-hidden="true"
                                                    ></i>
                                                    <span>Date of birth</span>
                                                </label>

                                                <CustomDatePicker
                                                    value={form.date_of_birth}
                                                    onChange={handleChange}
                                                    name="date_of_birth"
                                                />
                                            </div>

                                            <div className="col-12 col-md-6">
                                                <label
                                                    className="form-label text-body profile-label-with-icon"
                                                    style={labelStyle}
                                                >
                                                    <i
                                                        className="bi bi-person-badge text-body-secondary"
                                                        aria-hidden="true"
                                                    ></i>
                                                    <span>Gender</span>
                                                </label>

                                                <CustomGenderSelect
                                                    value={form.gender}
                                                    onChange={handleChange}
                                                    name="gender"
                                                />
                                            </div>

                                            <div className="col-12">
                                                <label className="form-label text-body" style={labelStyle}>
                                                    Address
                                                </label>

                                                <textarea
                                                    className="form-control profile-form-textarea"
                                                    name="address"
                                                    rows="4"
                                                    value={form.address}
                                                    onChange={handleChange}
                                                    placeholder="Enter address"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="profile-edit-panel p-3 p-md-4">
                                    <div className="row g-4">
                                        <div className="col-12 col-lg-6">
                                            <label className="form-label text-body" style={labelStyle}>
                                                Email <span className="text-danger">*</span>
                                            </label>

                                            <input
                                                type="email"
                                                className="form-control profile-form-control"
                                                name="email"
                                                value={form.email}
                                                onChange={handleChange}
                                                required
                                            />
                                        </div>

                                        <div className="col-12 col-lg-6">
                                            <label className="form-label text-body" style={labelStyle}>
                                                Contact number
                                            </label>

                                            <div className="profile-phone-field">
                                                <div className="profile-phone-prefix" aria-hidden="true">
                                                    <span
                                                        className="profile-phone-flag profile-phone-flag-emoji"
                                                        role="img"
                                                        aria-label="Philippines"
                                                    >
                                                        🇵🇭
                                                    </span>
                                                    <span className="profile-phone-code">+63</span>
                                                </div>

                                                <input
                                                    type="text"
                                                    className="profile-phone-input"
                                                    name="contact"
                                                    value={form.contact}
                                                    onChange={handleChange}
                                                    inputMode="numeric"
                                                    autoComplete="tel-national"
                                                    placeholder="9XX XXX XXXX"
                                                    maxLength={10}
                                                    aria-label="Philippine contact number"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="d-flex flex-column-reverse flex-sm-row justify-content-end align-items-stretch align-items-sm-center gap-2 mt-4 pt-2">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary fw-semibold"
                                    style={secondaryButtonStyle}
                                    onClick={handleCancelEdit}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="btn btn-dark fw-bold"
                                    style={primaryButtonStyle}
                                    disabled={saving}
                                >
                                    {saving ? "Saving..." : "Save changes"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

const profileRoot = document.getElementById("root");
if (profileRoot && !profileRoot.dataset.mounted) {
    profileRoot.dataset.mounted = "true";
    createRoot(profileRoot).render(<ProfilePage />);
}