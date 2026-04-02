import React from "https://esm.sh/react@18.3.1";
import { createRoot } from "https://esm.sh/react-dom@18.3.1/client";
import { sileo } from "https://esm.sh/sileo?deps=react@18.3.1,react-dom@18.3.1";

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
    return new Date(year, month - 1, day);
}

function formatYMD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
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

    return Array.from({ length: 42 }, (_, i) => {
        const date = new Date(start);
        date.setDate(start.getDate() + i);
        return date;
    });
}

function ProfileEditorStyles() {
  return (
    <style>{`
        .profile-picker-year-menu {
            margin-top: 10px;
            max-height: 220px;
            overflow-y: auto;
            scrollbar-width: none;      /* Firefox */
            -ms-overflow-style: none;   /* IE/Edge */
        }

        .profile-picker-year-menu::-webkit-scrollbar {
            width: 0;
            height: 0;
            display: none;
        }

        .profile-picker-year-menu::-webkit-scrollbar-thumb {
            background: transparent;
        }

        .profile-picker-year-menu::-webkit-scrollbar-track {
            background: transparent;
        }


        .profile-picker-title {
            position: relative;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            font-weight: 700;
            color: var(--bs-body-color);
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
            padding: 6px;
            background: var(--bs-body-bg);
            border: 1px solid rgba(17, 24, 39, 0.08);
            border-radius: 14px;
            box-shadow: 0 16px 34px rgba(17, 24, 39, 0.12);
        }

        .profile-picker-year-option {
            width: 100%;
            border: 0;
            background: transparent;
            text-align: left;
            padding: 8px 10px;
            border-radius: 10px;
            font-size: 13px;
            font-weight: 600;
            color: var(--bs-body-color);
            transition: background 0.18s ease, color 0.18s ease;
        }

        .profile-picker-year-option:hover {
            background: rgba(17, 24, 39, 0.05);
        }

        .profile-picker-year-option.is-selected {
            background: rgba(37, 99, 235, 0.10);
            color: #2563eb;
        }

        .profile-picker-shell {
            position: relative;
            max-width: 280px;
        }

        .profile-picker-trigger,
        .profile-select-trigger {
            width: 100%;
            min-height: 52px;
            max-width: 280px;
            border: 1px solid rgba(17, 24, 39, 0.08);
            border-radius: 18px;
            background: var(--bs-body-bg);
            box-shadow: 0 10px 24px rgba(17, 24, 39, 0.05);
            padding: 0 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            font-size: 15px;
            font-weight: 600;
            color: var(--bs-body-color);
            transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
        }

        .profile-picker-popup {
            width: 280px;
            max-width: 280px;
            padding: 14px 14px 10px;
            border-radius: 20px;
            box-shadow: 0 16px 34px rgba(17, 24, 39, 0.10);
        }

        .profile-picker-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 10px;
        }

        .profile-picker-title {
            font-size: 14px;
            font-weight: 700;
            color: var(--bs-body-color);
            letter-spacing: -0.01em;
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
            color: var(--bs-body-color);
            font-size: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s ease, transform 0.2s ease;
        }

        .profile-picker-nav button:hover {
            background: rgba(17, 24, 39, 0.05);
        }

        .profile-picker-weekdays,
        .profile-picker-grid {
            display: grid;
            grid-template-columns: repeat(7, 1fr);
        }

        .profile-picker-weekdays {
            margin-bottom: 2px;
        }

        .profile-picker-weekday {
            text-align: center;
            font-size: 10px;
            font-weight: 600;
            color: #6b7280;
            padding: 4px 0;
        }

        .profile-picker-day {
            position: relative;
            width: 32px;
            height: 32px;
            margin: 1px auto;
            border: 0;
            background: transparent;
            border-radius: 999px;
            font-size: 13px;
            font-weight: 500;
            color: #2f3137;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
        }

        .profile-picker-day:hover {
            background: rgba(17, 24, 39, 0.05);
        }

        .profile-picker-day.is-outside {
            color: #c6c7cc;
        }

        .profile-picker-day.is-selected {
            color: #2563eb;
            box-shadow: inset 0 0 0 2px #2563eb;
            font-weight: 700;
            background: transparent;
        }

        .profile-picker-day.is-today {
            color: #ef4444;
            font-weight: 700;
        }

        .profile-picker-day.is-today::after {
            content: "";
            position: absolute;
            bottom: 3px;
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: #ef4444;
        }

        @media (max-width: 575.98px) {
            .profile-picker-popup {
                width: min(280px, calc(100vw - 24px));
                max-width: min(280px, calc(100vw - 24px));
            }
        }
        .profile-picker-shell {
        position: relative;
        width: 100%;
        max-width: 280px;
        }

        .profile-picker-trigger,
        .profile-select-trigger {
            width: 100%;
            min-height: 52px;
            max-width: 280px;
            border: 1px solid rgba(17, 24, 39, 0.08);
            border-radius: 18px;
            background: var(--bs-body-bg);
            box-shadow: 0 10px 24px rgba(17, 24, 39, 0.05);
            padding: 0 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            font-size: 15px;
            font-weight: 600;
            color: var(--bs-body-color);
            transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
        }

        .profile-picker-trigger:hover,
        .profile-select-trigger:hover {
            border-color: rgba(17, 24, 39, 0.14);
            box-shadow: 0 12px 28px rgba(17, 24, 39, 0.07);
        }

        .profile-picker-trigger.is-empty,
        .profile-select-trigger.is-empty {
            color: var(--bs-secondary-color);
            font-weight: 500;
        }

        .profile-picker-popup,
        .profile-select-popup {
            position: absolute;
            top: calc(100% + 10px);
            left: 0;
            z-index: 70;
            background: var(--bs-body-bg);
            border: 1px solid rgba(17, 24, 39, 0.08);
            border-radius: 22px;
            box-shadow: 0 16px 34px rgba(17, 24, 39, 0.10);
            box-sizing: border-box;
        }

        .profile-picker-popup {
            width: 280px;
            max-width: 280px;
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
            font-size: 14px;
            font-weight: 700;
            color: var(--bs-body-color);
            letter-spacing: -0.01em;
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
            color: var(--bs-body-color);
            font-size: 16px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            transition: background 0.2s ease, transform 0.2s ease;
        }

        .profile-picker-nav button:hover {
            background: rgba(17, 24, 39, 0.05);
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
            color: #6b7280;
            padding: 4px 0;
        }

        .profile-picker-day {
            position: relative;
            width: 30px;
            height: 30px;
            margin: 1px auto;
            border: 0;
            background: transparent;
            border-radius: 999px;
            font-size: 13px;
            font-weight: 500;
            color: #2f3137;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
        }

        .profile-picker-day:hover {
            background: rgba(17, 24, 39, 0.05);
        }

        .profile-picker-day.is-outside {
            color: #c6c7cc;
        }

        .profile-picker-day.is-selected {
            color: #2563eb;
            box-shadow: inset 0 0 0 2px #2563eb;
            font-weight: 700;
            background: transparent;
        }

        .profile-picker-day.is-today {
            color: #ef4444;
            font-weight: 700;
        }

        .profile-picker-day.is-today::after {
            content: "";
            position: absolute;
            bottom: 3px;
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: #ef4444;
        }

        .profile-select-option {
            width: 100%;
            border: 0;
            background: transparent;
            text-align: left;
            padding: 12px 14px;
            border-radius: 14px;
            font-size: 14px;
            font-weight: 600;
            color: var(--bs-body-color);
            transition: background 0.18s ease, color 0.18s ease;
        }

        .profile-select-option:hover {
            background: rgba(17, 24, 39, 0.05);
        }

        .profile-select-option.is-selected {
            background: rgba(37, 99, 235, 0.10);
            color: #2563eb;
        }

        @media (max-width: 575.98px) {
            .profile-picker-popup {
                width: min(280px, calc(100vw - 24px));
                max-width: min(280px, calc(100vw - 24px));
            }
        }
        .profile-edit-chip {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    margin-bottom: 14px;
    border-radius: 999px;
    background: rgba(17, 24, 39, 0.05);
    color: var(--bs-body-color);
    font-size: 13px;
    font-weight: 700;
    line-height: 1;
}

.profile-edit-chip i {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    line-height: 1;
    flex-shrink: 0;
}

.profile-label-with-icon {
    display: inline-flex;
    align-items: center;
    gap: 10px;
}

.profile-label-with-icon i {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    flex-shrink: 0;
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

                <div className="border-top mt-3 pt-4">
                    {children}
                </div>
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
    const today = new Date();

    React.useEffect(() => {
        if (selectedDate) {
            setViewDate(selectedDate);
        }
    }, [value]);

    React.useEffect(() => {
        function handleOutside(e) {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false);
                setYearMenuOpen(false);
            }
        }

        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    const days = getCalendarDays(viewDate);
    const years = React.useMemo(
        () => getYearOptions(viewDate.getFullYear()),
        [viewDate]
    );

    const pickDate = (date) => {
        onChange({
            target: {
                name,
                value: formatYMD(date)
            }
        });
        setOpen(false);
        setYearMenuOpen(false);
    };

    const changeYear = (year) => {
        setViewDate(new Date(year, viewDate.getMonth(), 1));
        setYearMenuOpen(false);
    };

    return (
        <div className="profile-picker-shell" ref={rootRef}>
            <button
                type="button"
                className={`profile-picker-trigger ${!value ? "is-empty" : ""}`}
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
            >
                <span>{value ? formatReadableDate(value) : "Select date of birth"}</span>
                <i className="bi bi-chevron-down"></i>
            </button>

            {open && (
                <div className="profile-picker-popup">
                    <div className="profile-picker-header">
                        <div className="profile-picker-title">
                            <span className="profile-picker-title-month">
                                {formatCalendarMonth(viewDate)}
                            </span>

                            <button
                                type="button"
                                className="profile-picker-year-trigger"
                                onClick={() => setYearMenuOpen((v) => !v)}
                                aria-expanded={yearMenuOpen}
                            >
                                <span>{viewDate.getFullYear()}</span>
                                <i className={`bi ${yearMenuOpen ? "bi-chevron-up" : "bi-chevron-down"}`}></i>
                            </button>

                            {yearMenuOpen && (
                                <div className="profile-picker-year-menu">
                                    {years.map((year) => (
                                        <button
                                            key={year}
                                            type="button"
                                            className={`profile-picker-year-option ${year === viewDate.getFullYear() ? "is-selected" : ""}`}
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
                                <i className="bi bi-chevron-left"></i>
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
                                <i className="bi bi-chevron-right"></i>
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

                            return (
                                <button
                                    key={day.toISOString()}
                                    type="button"
                                    className={[
                                        "profile-picker-day",
                                        isOutside ? "is-outside" : "",
                                        selected ? "is-selected" : "",
                                        !selected && isTodayFlag ? "is-today" : ""
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

    const options = [
        { value: "Male", label: "Male" },
        { value: "Female", label: "Female" },
        { value: "Rather not say", label: "Rather not say" }
    ];

    React.useEffect(() => {
        function handleOutside(e) {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    const current = options.find((opt) => opt.value === value)?.label || "Select gender";

    return (
        <div className="profile-picker-shell" ref={rootRef}>
            <button
                type="button"
                className={`profile-select-trigger ${!value ? "is-empty" : ""}`}
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
            >
                <span>{current}</span>
                <i className="bi bi-chevron-down"></i>
            </button>

            {open && (
                <div className="profile-select-popup">
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            type="button"
                            className={`profile-select-option ${value === opt.value ? "is-selected" : ""}`}
                            onClick={() => {
                                onChange({
                                    target: {
                                        name,
                                        value: opt.value
                                    }
                                });
                                setOpen(false);
                            }}
                        >
                            {opt.label}
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
        setForm({
            full_name: data.name || "",
            nickname: data.nickname || "",
            email: data.email || "",
            contact: data.contact || "",
            address: data.address || "",
            gender: data.gender || "",
            date_of_birth: data.date_of_birth || ""
        });
        setPreviewUrl(data.profile_image_url || "");
        setRemoveImage(false);
    }, []);

    React.useEffect(() => {
        let mounted = true;

        async function loadProfile() {
            try {
                const res = await fetch("php/get_profile.php", {
                    credentials: "same-origin"
                });

                const data = await parseJsonResponse(res);

                if (!res.ok || data.error) {
                    throw new Error(data.error || "Failed to load profile");
                }

                if (!mounted) return;

                hydrateForm(data);
                setPageError("");
            } catch (error) {
                if (!mounted) return;
                setPageError(error.message || "Failed to load profile");
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
        if (!selectedImage) return;

        const objectUrl = URL.createObjectURL(selectedImage);
        setPreviewUrl(objectUrl);

        return () => {
            URL.revokeObjectURL(objectUrl);
        };
    }, [selectedImage]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleStartEdit = (section) => {
        if (profile) hydrateForm(profile);
        setSelectedImage(null);
        setRemoveImage(false);
        setPageError("");
        setActiveSection(section);
    };

    const handleCancelEdit = () => {
        if (profile) hydrateForm(profile);
        setSelectedImage(null);
        setRemoveImage(false);
        setPageError("");
        setActiveSection(null);
    };

    const handleImageChange = (e) => {
        const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
        if (!file) return;

        const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
        const maxSize = 15 * 1024 * 1024;

        if (!allowedTypes.includes(file.type)) {
            sileo.error({
                title: "Invalid image type",
                description: "Please upload a PNG, JPEG, or WEBP image."
            });
            return;
        }

        if (file.size > maxSize) {
            sileo.error({
                title: "Image too large",
                description: "Please upload an image under 15MB."
            });
            return;
        }

        setSelectedImage(file);
        setRemoveImage(false);

        sileo.info({
            title: "Picture selected",
            description: "Click Save changes to upload the new image."
        });
    };

    const handleRemoveImage = () => {
        if (!previewUrl && !selectedImage) {
            sileo.info({
                title: "No picture to remove",
                description: "There is no profile picture set yet."
            });
            return;
        }

        setSelectedImage(null);
        setPreviewUrl("");

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }

        setRemoveImage(true);

        sileo.warning({
            title: "Picture removed from preview",
            description: "Click Save changes to permanently delete it."
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setPageError("");

        const formData = new FormData();
        formData.append("name", form.full_name.trim());
        formData.append("nickname", form.nickname.trim());
        formData.append("email", form.email.trim());
        formData.append("contact", form.contact.trim());
        formData.append("address", form.address.trim());
        formData.append("gender", form.gender);
        formData.append("date_of_birth", form.date_of_birth);

        if (removeImage) {
            formData.append("remove_profile_image", "1");
        }

        if (selectedImage) {
            formData.append("profile_image", selectedImage);
        }

        const request = fetch("php/update_profile.php", {
            method: "POST",
            body: formData,
            credentials: "same-origin"
        }).then(async (res) => {
            const data = await parseJsonResponse(res);

            if (!res.ok || data.error) {
                throw new Error(data.error || "Failed to update profile");
            }

            return data;
        });

        try {
            const data = await sileo.promise(request, {
                loading: {
                    title: "Saving profile...",
                    description:
                        activeSection === "contact"
                            ? "Updating your contact information."
                            : selectedImage
                                ? "Uploading your profile picture."
                                : removeImage
                                    ? "Removing your profile picture."
                                    : "Updating your personal information."
                },
                success: {
                    title: "Profile updated",
                    description: "Your changes were saved successfully."
                },
                error: (err) => ({
                    title: "Update failed",
                    description: err.message || "Something went wrong."
                })
            });

            hydrateForm(data.profile);
            setSelectedImage(null);
            setRemoveImage(false);
            setActiveSection(null);

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
    };

    const displayName = form.full_name.trim() || profile?.name || "User";
    const role = profile?.role || "—";
    const departmentName = profile?.department_name || "—";
    const employeeId = profile?.employee_id || "—";
    const departmentId = profile?.department_id || "—";
    const isEditing = activeSection !== null;

    const labelStyle = {
        fontSize: "13px",
        fontWeight: 700,
        letterSpacing: "0.01em",
        marginBottom: "12px"
    };

    const fieldStyle = {
        minHeight: "54px",
        borderRadius: "18px",
        paddingInline: "16px",
        fontSize: "15px"
    };

    const textareaStyle = {
        minHeight: "124px",
        borderRadius: "18px",
        padding: "15px 16px",
        fontSize: "15px"
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
                            <div className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></div>
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
                                        className={`bi ${activeSection === "contact" ? "bi-envelope-paper" : "bi-person-vcard"}`}
                                        aria-hidden="true"
                                    ></i>
                                    <span>
                                        {activeSection === "contact" ? "Contact editor" : "Profile editor"}
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
                                    style={{ fontSize: "15px", maxWidth: "760px", lineHeight: 1.65 }}
                                >
                                    {activeSection === "contact"
                                        ? "Keep your email and phone information updated so your account details stay accurate."
                                        : "Refine your personal details and profile photo with a cleaner, more polished editing experience."}
                                </p>
                            </>
                        )}
                    </div>

                    {pageError && profile ? (
                        <AlertMessage>{pageError}</AlertMessage>
                    ) : null}

                    {!isEditing ? (
                        <>
                            <div
                                className="card border shadow-sm bg-body-tertiary mb-4"
                                style={{ borderRadius: "16px" }}
                            >
                                <div className="card-body px-4 py-3 px-xl-4 py-xl-3">
                                    <div className="row g-4 align-items-center">
                                        <div className="col-12 col-xl-5">
                                            <div className="d-flex align-items-center gap-3" style={{ minWidth: 0 }}>
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
                                            <div className="vr opacity-25" style={{ minHeight: "118px" }}></div>
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
                                                <InfoItem label="Date of birth" value={form.date_of_birth} />
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
                                                    <InfoItem label="Contact number" value={form.contact} />
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
                                                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                                                >
                                                    <i className="bi bi-cloud-arrow-up"></i>
                                                    Upload image
                                                </button>

                                                <button
                                                    type="button"
                                                    className="btn btn-outline-danger d-inline-flex align-items-center gap-2"
                                                    style={softIconButtonStyle}
                                                    onClick={handleRemoveImage}
                                                >
                                                    <i className="bi bi-trash3-fill"></i>
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
                                                    style={fieldStyle}
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
                                                    style={fieldStyle}
                                                />
                                            </div>

                                            <div className="col-12 col-md-6">
                                                <label
                                                    className="form-label text-body profile-label-with-icon"
                                                    style={labelStyle}
                                                >
                                                    <i className="bi bi-calendar3 text-body-secondary" aria-hidden="true"></i>
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
                                                    <i className="bi bi-person-badge text-body-secondary" aria-hidden="true"></i>
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
                                                    style={textareaStyle}
                                                ></textarea>
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
                                                style={fieldStyle}
                                            />
                                        </div>

                                        <div className="col-12 col-lg-6">
                                            <label className="form-label text-body" style={labelStyle}>
                                                Contact number
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control profile-form-control"
                                                name="contact"
                                                value={form.contact}
                                                onChange={handleChange}
                                                placeholder="Enter contact number"
                                                style={fieldStyle}
                                            />
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
if (profileRoot) {
    createRoot(profileRoot).render(<ProfilePage />);
}