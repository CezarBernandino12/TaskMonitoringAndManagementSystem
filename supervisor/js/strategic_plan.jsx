const { useState, useEffect, useCallback, useRef } = React;

// ── Utility ───────────────────────────────────────────────────────────────────
let _idCounter = 0;
const nextId = () => ++_idCounter;

const URL_PLAN_ID = (() => {
  const p = new URLSearchParams(window.location.search).get("plan_id");
  return p ? parseInt(p, 10) : 0;
})();

function makeGoal(prefill = {}) {
  return {
    id:          nextId(),
    dbId:        null,
    goal:        "",
    objectives:  "",
    plans:       [""],
    timeline:    "",
    personnel:   "",
    personnelIds:[],
    metric:      "",
    remarks:     "",
    ...prefill,
  };
}

// ── Global Styles ─────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'DM Sans', sans-serif;
    background: #F5F3EE;
    color: #1A1A2E;
  }

  :root {
    --navy:    #1A1A2E;
    --ink:     #2D2D44;
    --gold:    #C9A84C;
    --gold-lt: #F5E9C8;
    --cream:   #F5F3EE;
    --paper:   #FDFCF9;
    --border:  #E3DDD3;
    --muted:   #8B8577;
    --indigo:  #4B5FD4;
    --indigo-lt: #EEF0FB;
    --red:     #C0392B;
    --green:   #1E7C4B;
    --green-lt:#E6F4ED;
  }

  @keyframes shimmer {
    0%   { background-position: 200% 0 }
    100% { background-position: -200% 0 }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(12px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes toastIn {
    from { opacity: 0; transform: translateY(8px) scale(.97); }
    to   { opacity: 1; transform: none; }
  }

  .goal-card { animation: fadeUp .25s ease both; }

  input, textarea, select {
    font-family: 'DM Sans', sans-serif;
  }

  input::placeholder, textarea::placeholder {
    color: #B8B2A8;
    font-weight: 300;
  }

  /* Custom scrollbar */
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: var(--cream); }
  ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--muted); }

  .section-card {
    background: var(--paper);
    border-radius: 16px;
    border: 1px solid var(--border);
    box-shadow: 0 2px 12px rgba(26,26,46,.04), 0 1px 3px rgba(26,26,46,.03);
    margin-bottom: 20px;
    overflow: hidden;
    transition: box-shadow .2s;
  }
  .section-card:hover {
    box-shadow: 0 4px 20px rgba(26,26,46,.07), 0 1px 3px rgba(26,26,46,.04);
  }

  .field-label {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--ink);
    margin-bottom: 7px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .field-hint {
    font-size: 12px;
    color: var(--muted);
    margin-top: 5px;
    font-weight: 300;
  }

  .inp {
    width: 100%;
    padding: 10px 14px;
    border: 1.5px solid var(--border);
    border-radius: 10px;
    font-size: 14px;
    color: var(--navy);
    background: #fff;
    outline: none;
    transition: border-color .15s, box-shadow .15s;
    font-family: 'DM Sans', sans-serif;
    font-weight: 400;
  }
  .inp:focus {
    border-color: var(--indigo);
    box-shadow: 0 0 0 3px rgba(75,95,212,.12);
  }
  .inp:hover:not(:focus) {
    border-color: #C5BFB5;
  }

  textarea.inp {
    resize: vertical;
    line-height: 1.6;
  }

  .btn-primary {
    background: var(--navy);
    color: #fff;
    border: none;
    border-radius: 10px;
    padding: 11px 26px;
    font-size: 14px;
    font-weight: 600;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: background .15s, transform .1s, box-shadow .15s;
    letter-spacing: .01em;
  }
  .btn-primary:hover:not(:disabled) {
    background: #2D2D44;
    box-shadow: 0 4px 14px rgba(26,26,46,.25);
  }
  .btn-primary:active:not(:disabled) { transform: scale(.98); }
  .btn-primary:disabled { opacity: .55; cursor: not-allowed; }

  .btn-ghost {
    background: transparent;
    color: var(--navy);
    border: 1.5px solid var(--border);
    border-radius: 10px;
    padding: 10px 20px;
    font-size: 13px;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
    transition: background .15s, border-color .15s;
  }
  .btn-ghost:hover {
    background: var(--cream);
    border-color: #C5BFB5;
  }

  .btn-add {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    background: var(--cream);
    border: 1.5px dashed #C5BFB5;
    border-radius: 10px;
    color: var(--ink);
    cursor: pointer;
    padding: 9px 16px;
    font-size: 13px;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
    transition: background .15s, border-color .15s;
  }
  .btn-add:hover {
    background: var(--gold-lt);
    border-color: var(--gold);
    color: #7A5C1A;
  }

  .goal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 15px 20px;
    cursor: pointer;
    user-select: none;
    transition: background .15s;
  }
  .goal-header:hover { background: #FAF9F6; }
  .goal-header.open { background: #F8F6F0; border-bottom: 1px solid var(--border); }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border-radius: 20px;
    padding: 3px 11px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: .02em;
  }

  .save-bar {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    background: var(--navy);
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 36px;
    box-shadow: 0 -4px 20px rgba(0,0,0,.15);
    z-index: 100;
    border-top: 1px solid rgba(255,255,255,.06);
  }

  .skeleton {
    background: linear-gradient(90deg, #EDE8E0 25%, #E3DDD3 50%, #EDE8E0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
    border-radius: 8px;
  }

  /* ── History Sidebar ── */
  .history-sidebar {
    width: 300px;
    flex-shrink: 0;
    position: sticky;
    top: 73px;
    max-height: calc(100vh - 93px);
    display: flex;
    flex-direction: column;
    background: var(--paper);
    border-radius: 16px;
    border: 1px solid var(--border);
    box-shadow: 0 2px 12px rgba(26,26,46,.04);
    overflow: hidden;
  }

  .history-sidebar-header {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    background: linear-gradient(135deg, #FAF9F5 0%, #F5F3EE 100%);
    flex-shrink: 0;
  }

  .history-sidebar-body {
    overflow-y: auto;
    flex: 1;
  }

  .history-item {
    padding: 14px 18px;
    border-bottom: 1px solid var(--border);
    cursor: pointer;
    transition: background .15s;
    text-decoration: none;
    display: block;
    color: inherit;
  }
  .history-item:hover { background: var(--cream); }
  .history-item.active { background: var(--indigo-lt); border-left: 3px solid var(--indigo); }
  .history-item:last-child { border-bottom: none; }

  @media (max-width: 1100px) {
    .history-sidebar { width: 260px; }
  }
  @media (max-width: 900px) {
    .history-sidebar { display: none; }
  }
`;

// ── Field ─────────────────────────────────────────────────────────────────────
function Field({ label, required, hint, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div className="field-label">
        {label}
        {required && <span style={{ color: "var(--red)", fontSize: 14, lineHeight: 1 }}>*</span>}
      </div>
      {children}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

// ── FocusInput / FocusTextarea ────────────────────────────────────────────────
function FocusInput({ className = "", ...props }) {
  return <input className={`inp ${className}`} {...props} />;
}
function FocusTextarea({ className = "", ...props }) {
  return <textarea className={`inp ${className}`} {...props} />;
}

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ icon, title, subtitle, badge, step, children }) {
  return (
    <div className="section-card" style={{ animation: "fadeUp .3s ease both" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "18px 24px", borderBottom: "1px solid var(--border)",
        background: "linear-gradient(135deg, #FAF9F5 0%, #F5F3EE 100%)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {step && (
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "var(--navy)", color: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, flexShrink: 0,
            }}>{step}</div>
          )}
          {icon && !step && (
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: "var(--gold-lt)", color: "var(--gold)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, flexShrink: 0,
            }}>{icon}</div>
          )}
          <div>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700, fontSize: 16, color: "var(--navy)",
              letterSpacing: ".01em",
            }}>{title}</div>
            {subtitle && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, fontWeight: 300 }}>{subtitle}</div>}
          </div>
        </div>
        {badge}
      </div>
      <div style={{ padding: "22px 24px" }}>{children}</div>
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
function Divider() {
  return <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "4px 0" }} />;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ message, type }) {
  if (!message) return null;
  const cfg = {
    error:   { bg: "#C0392B", icon: "✕" },
    info:    { bg: "var(--indigo)", icon: "ℹ" },
    success: { bg: "var(--green)", icon: "✓" },
  }[type] ?? { bg: "var(--navy)", icon: "•" };
  return (
    <div style={{
      position: "fixed", bottom: 88, right: 28,
      display: "flex", alignItems: "center", gap: 10,
      background: cfg.bg, color: "#fff",
      padding: "12px 18px", borderRadius: 12,
      fontWeight: 500, fontSize: 14,
      boxShadow: "0 8px 24px rgba(0,0,0,.2)",
      zIndex: 9999, animation: "toastIn .2s ease",
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: "50%",
        background: "rgba(255,255,255,.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, flexShrink: 0,
      }}>{cfg.icon}</span>
      {message}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function Skeleton({ h = 40, mb = 8 }) {
  return <div className="skeleton" style={{ height: h, marginBottom: mb }} />;
}

// ── PersonnelPicker ───────────────────────────────────────────────────────────
function PersonnelPicker({ value, onChange, deptUsers }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");
  const rootRef           = useRef(null);

  const selectedNames = value
    ? value.split("\n").map(s => s.trim()).filter(Boolean)
    : [];

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
        rows={2} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={"e.g. Mr. A. Limpin\nMr. K.J Adonis (one per line)"}
      />
    );
  }

  const filtered = deptUsers.filter(u =>
    u.name.toLowerCase().includes(query.toLowerCase())
  );

  const toggle = (name) => {
    const next = selectedNames.includes(name)
      ? selectedNames.filter(n => n !== name)
      : [...selectedNames, name];
    onChange(next.join("\n"));
  };

  const roleColor = (role) => ({
    supervisor: { bg: "#EEF0FB", color: "#3B4FBF" },
    staff:      { bg: "var(--green-lt)", color: "var(--green)" },
    admin:      { bg: "#F5F0FC", color: "#6B3FA0" },
  }[role] ?? { bg: "var(--cream)", color: "var(--muted)" });

  return (
    <div ref={rootRef} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen(o => !o)}
        className="inp"
        style={{
          cursor: "pointer", minHeight: 44,
          display: "flex", alignItems: "flex-start", flexWrap: "wrap",
          gap: 5, padding: "8px 12px",
          ...(open ? { borderColor: "var(--indigo)", boxShadow: "0 0 0 3px rgba(75,95,212,.12)" } : {}),
        }}
      >
        {selectedNames.length === 0 ? (
          <span style={{ color: "#B8B2A8", lineHeight: "28px", fontSize: 14, fontWeight: 300 }}>
            Click to select personnel…
          </span>
        ) : selectedNames.map(name => (
          <span key={name} className="tag" style={{ background: "var(--indigo-lt)", color: "var(--indigo)" }}>
            {name}
            <span
              onClick={e => { e.stopPropagation(); toggle(name); }}
              style={{ cursor: "pointer", opacity: .7, fontSize: 13, fontWeight: 700, lineHeight: 1 }}
            >×</span>
          </span>
        ))}
        <span style={{ marginLeft: "auto", color: "var(--muted)", lineHeight: "28px", fontSize: 11, flexShrink: 0 }}>
          {open ? "▲" : "▼"}
        </span>
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
          background: "#fff", border: "1.5px solid var(--border)",
          borderRadius: 12, boxShadow: "0 12px 32px rgba(0,0,0,.12)",
          zIndex: 200, overflow: "hidden", animation: "fadeUp .15s ease",
        }}>
          <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", background: "var(--cream)" }}>
            <input
              autoFocus type="text" value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name…"
              className="inp"
              style={{ padding: "7px 12px", fontSize: 13 }}
            />
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "14px 16px", color: "var(--muted)", fontSize: 13, fontWeight: 300 }}>
                No users found
              </div>
            ) : filtered.map(u => {
              const selected = selectedNames.includes(u.name);
              const rc = roleColor(u.role);
              return (
                <div
                  key={u.id} onClick={() => toggle(u.name)}
                  style={{
                    display: "flex", alignItems: "center", gap: 11,
                    padding: "10px 16px", cursor: "pointer",
                    background: selected ? "#F0F2FD" : "transparent",
                    transition: "background .1s",
                  }}
                  onMouseEnter={e => { if (!selected) e.currentTarget.style.background = "var(--cream)"; }}
                  onMouseLeave={e => { if (!selected) e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                    border: `2px solid ${selected ? "var(--indigo)" : "var(--border)"}`,
                    background: selected ? "var(--indigo)" : "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all .1s",
                  }}>
                    {selected && <span style={{ color: "#fff", fontSize: 10, fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ fontSize: 14, color: "var(--navy)", flex: 1, fontWeight: 400 }}>{u.name}</span>
                  <span className="tag" style={{ ...rc, textTransform: "capitalize", fontSize: 11 }}>{u.role}</span>
                </div>
              );
            })}
          </div>
          {selectedNames.length > 0 && (
            <div style={{
              padding: "9px 16px", borderTop: "1px solid var(--border)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "var(--cream)",
            }}>
              <span style={{ fontSize: 12, color: "var(--indigo)", fontWeight: 600 }}>
                {selectedNames.length} selected
              </span>
              <button
                onClick={() => onChange("")}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 12, color: "var(--red)", fontWeight: 600,
                  fontFamily: "inherit",
                }}
              >Clear all</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── PlanStep ──────────────────────────────────────────────────────────────────
function PlanStep({ value, index, onUpdate, onRemove, canRemove }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
      <div style={{
        minWidth: 26, height: 26, borderRadius: 8, background: "var(--gold-lt)",
        color: "#8A6020", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, flexShrink: 0, border: "1px solid #E8D8A0",
      }}>
        {index + 1}
      </div>
      <FocusInput
        type="text" value={value}
        onChange={e => onUpdate(index, e.target.value)}
        placeholder={`Step ${index + 1}…`}
        style={{ flex: 1 }}
      />
      {canRemove && (
        <button
          onClick={() => onRemove(index)}
          style={{
            background: "none", border: "1.5px solid #FACACA", borderRadius: 8,
            color: "var(--red)", cursor: "pointer", padding: "5px 10px",
            fontSize: 14, lineHeight: 1, flexShrink: 0,
            fontFamily: "inherit", transition: "background .1s",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "#FFF0F0"}
          onMouseLeave={e => e.currentTarget.style.background = "none"}
          title="Remove step"
        >×</button>
      )}
    </div>
  );
}

// ── GoalCard ──────────────────────────────────────────────────────────────────
function GoalCard({ goal, index, onRemove, onUpdate, onAddPlan, onRemovePlan, onUpdatePlan, deptUsers }) {
  const [open, setOpen] = useState(index === 0);
  const planCount = goal.plans.filter(p => p.trim()).length;
  const personCount = goal.personnel ? goal.personnel.split("\n").filter(Boolean).length : 0;

  return (
    <div className="goal-card section-card" style={{ marginBottom: 12, animationDelay: `${index * .05}s` }}>
      <div
        className={`goal-header ${open ? "open" : ""}`}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: open ? "var(--navy)" : "var(--cream)",
            color: open ? "#fff" : "var(--muted)",
            border: `1.5px solid ${open ? "var(--navy)" : "var(--border)"}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 14, flexShrink: 0,
            transition: "all .2s",
          }}>
            {index + 1}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: "var(--navy)" }}>
              {goal.goal || <span style={{ color: "var(--muted)", fontWeight: 300, fontStyle: "italic" }}>Untitled Goal</span>}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {planCount > 0 && (
                <span className="tag" style={{ background: "var(--cream)", color: "var(--muted)", fontSize: 11, padding: "2px 8px" }}>
                  {planCount} step{planCount !== 1 ? "s" : ""}
                </span>
              )}
              {personCount > 0 && (
                <span className="tag" style={{ background: "var(--indigo-lt)", color: "var(--indigo)", fontSize: 11, padding: "2px 8px" }}>
                  {personCount} assigned
                </span>
              )}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={e => { e.stopPropagation(); onRemove(goal.id); }}
            style={{
              background: "none", border: "1.5px solid #FACACA",
              borderRadius: 8, color: "var(--red)", cursor: "pointer",
              padding: "5px 12px", fontSize: 12, fontWeight: 600,
              fontFamily: "inherit", transition: "background .1s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#FFF0F0"}
            onMouseLeave={e => e.currentTarget.style.background = "none"}
          >Remove</button>
          <span style={{
            fontSize: 11, color: "var(--muted)",
            transform: open ? "rotate(180deg)" : "rotate(0)",
            display: "inline-block", transition: "transform .2s",
          }}>▼</span>
        </div>
      </div>

      {open && (
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 18, animation: "fadeUp .2s ease" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Goal Title" required>
              <FocusInput
                type="text" value={goal.goal}
                onChange={e => onUpdate(goal.id, "goal", e.target.value)}
                placeholder="e.g. Improve the Procurement System"
              />
            </Field>
            <Field label="Objectives" hint="Each line becomes a numbered objective in the document.">
              <FocusTextarea
                rows={3} value={goal.objectives}
                onChange={e => onUpdate(goal.id, "objectives", e.target.value)}
                placeholder={"Objective 1\nObjective 2\nObjective 3…"}
              />
            </Field>
          </div>

          <Divider />

          <Field label="Detailed Plan Steps" required>
            {goal.plans.map((p, pi) => (
              <PlanStep
                key={pi} value={p} index={pi}
                onUpdate={(idx, val) => onUpdatePlan(goal.id, idx, val)}
                onRemove={idx => onRemovePlan(goal.id, idx)}
                canRemove={goal.plans.length > 1}
              />
            ))}
            <button className="btn-add" onClick={() => onAddPlan(goal.id)} style={{ marginTop: 4 }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Step
            </button>
          </Field>

          <Divider />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Specific Timeline">
              <FocusInput
                type="text" value={goal.timeline}
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

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Metric for Success">
              <FocusTextarea
                rows={2} value={goal.metric}
                onChange={e => onUpdate(goal.id, "metric", e.target.value)}
                placeholder="e.g. 30% faster processing time"
              />
            </Field>
            <Field label="Remarks / Evaluation">
              <FocusTextarea
                rows={2} value={goal.remarks}
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

// ── Plan History Sidebar ──────────────────────────────────────────────────────
function PlanHistorySidebar({ deptPlans, loadingHistory, currentPlanId }) {
  const fmt = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <aside className="history-sidebar">
      <div className="history-sidebar-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "var(--navy)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, flexShrink: 0,
          }}>🗂</div>
          <div>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700, fontSize: 14, color: "var(--navy)",
            }}>Department Plans</div>
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1, fontWeight: 300 }}>
              {loadingHistory
                ? "Loading…"
                : `${deptPlans.length} plan${deptPlans.length !== 1 ? "s" : ""} from your department`}
            </div>
          </div>
        </div>
      </div>

      <div className="history-sidebar-body">
        {loadingHistory ? (
          <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
            {[1, 2, 3].map(i => (
              <div key={i}>
                <Skeleton h={13} mb={6} />
                <Skeleton h={10} mb={0} />
              </div>
            ))}
          </div>
        ) : deptPlans.length === 0 ? (
          <div style={{
            padding: "28px 18px",
            textAlign: "center",
            color: "var(--muted)",
            fontSize: 13,
            fontWeight: 300,
            lineHeight: 1.6,
          }}>
            <div style={{ fontSize: 26, marginBottom: 8 }}>📭</div>
            No other plans found for your department yet.
          </div>
        ) : (
          deptPlans.map(plan => {
            const isActive = plan.id === currentPlanId;
            return (
              <a
                key={plan.id}
                href={plan.preview_url || `strategic-plan-preview.html?id=${plan.id}`}
                className={`history-item${isActive ? " active" : ""}`}
              >
                <div style={{
                  fontWeight: 600,
                  fontSize: 13,
                  color: isActive ? "var(--indigo)" : "var(--navy)",
                  lineHeight: 1.4,
                  marginBottom: 4,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}>
                  {plan.plan_title || "Untitled Plan"}
                  {isActive && (
                    <span style={{
                      display: "inline-block", marginLeft: 6,
                      fontSize: 10, fontWeight: 700,
                      background: "var(--indigo)", color: "#fff",
                      borderRadius: 4, padding: "1px 6px", verticalAlign: "middle",
                    }}>Current</span>
                  )}
                </div>

                {/* Vision snippet */}
                {plan.vision && (
                  <div style={{
                    fontSize: 11, color: "var(--muted)", fontWeight: 300,
                    lineHeight: 1.5, marginBottom: 6,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}>
                    {plan.vision}
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                  {/* Created by */}
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: "var(--indigo-lt)", color: "var(--indigo)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 9, fontWeight: 700, flexShrink: 0,
                    }}>
                      {(plan.creator_name || "?")[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400, maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {plan.creator_name || "Unknown"}
                    </span>
                  </div>

                  {/* Date */}
                  <span style={{
                    fontSize: 10, color: "var(--muted)", fontWeight: 300,
                    background: "var(--cream)", borderRadius: 6, padding: "2px 7px",
                    border: "1px solid var(--border)",
                  }}>
                    {fmt(plan.updated_at || plan.created_at)}
                  </span>
                </div>
              </a>
            );
          })
        )}
      </div>

      {/* Footer link */}
      {!loadingHistory && deptPlans.length > 0 && (
        <div style={{
          padding: "11px 18px",
          borderTop: "1px solid var(--border)",
          background: "var(--cream)",
          flexShrink: 0,
        }}>
          <a
            href="strategic-plans.php"
            style={{
              fontSize: 12, color: "var(--indigo)", fontWeight: 600,
              textDecoration: "none", display: "flex", alignItems: "center", gap: 4,
            }}
          >
            View all department plans →
          </a>
        </div>
      )}
    </aside>
  );
}


function ProgressDots({ total, current }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{
          width: i < current ? 20 : 7, height: 7,
          borderRadius: 4, transition: "width .3s ease",
          background: i < current ? "var(--gold)" : "var(--border)",
        }} />
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
function StrategicPlanGenerator() {
  const [loading,          setLoading]          = useState(true);
  const [loadErr,          setLoadErr]          = useState(null);
  const [isEdit,           setIsEdit]           = useState(false);

  const [planTitle,        setPlanTitle]        = useState("");
  const [department,       setDepartment]       = useState("");
  const [preparedBy,       setPreparedBy]       = useState("");
  const [preparedByTitle,  setPreparedByTitle]  = useState("");
  const [vision,           setVision]           = useState("");
  const [mission,          setMission]          = useState("");
  const [goals,            setGoals]            = useState([]);
  const [deptUsers,        setDeptUsers]        = useState([]);
  const [deptPlans,        setDeptPlans]        = useState([]);
  const [loadingHistory,   setLoadingHistory]   = useState(true);
  const [saving,           setSaving]           = useState(false);
  const [toast,            setToast]            = useState({ message: "", type: "success" });
  const [notedByExecDir,   setNotedByExecDir]   = useState("");
  const [notedByPresident, setNotedByPresident] = useState("");

  // Compute filled sections for progress
  const filledSections = [
    planTitle.trim() && department.trim() && preparedBy.trim(),
    notedByExecDir.trim() && notedByPresident.trim(),
    vision.trim() && mission.trim(),
    goals.length > 0 && goals.some(g => g.goal.trim()),
  ].filter(Boolean).length;

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "success" }), 3200);
  }, []);

  useEffect(() => {
    const url = URL_PLAN_ID > 0
      ? `php/strategic_plan.php?plan_id=${URL_PLAN_ID}`
      : "php/strategic_plan.php";

    fetch(url)
      .then(r => { if (!r.ok) throw new Error(`Server returned ${r.status}`); return r.json(); })
      .then(data => {
        if (data.error) throw new Error(data.error);
        setDeptUsers(data.dept_users ?? []);

        const allUsers  = data.all_users ?? [];
        const execDir   = allUsers.find(u => u.role === "executive_director");
        const president = allUsers.find(u => u.role === "president");
        if (execDir)   setNotedByExecDir(execDir.name);
        if (president) setNotedByPresident(president.name);

        if (data.plan) {
          const p = data.plan;
          setPlanTitle(p.plan_title           ?? "");
          setDepartment(p.department          ?? "");
          setPreparedBy(p.prepared_by         ?? "");
          setPreparedByTitle(p.prepared_by_title ?? "");
          setVision(p.vision                  ?? "");
          setMission(p.mission                ?? "");
          if (p.noted_by_exec_dir)   setNotedByExecDir(p.noted_by_exec_dir);
          if (p.noted_by_president)  setNotedByPresident(p.noted_by_president);

          const loadedGoals = (data.goals ?? []).map(g => makeGoal({
            dbId:       g.id,
            goal:       g.goal       ?? "",
            objectives: g.objectives ?? "",
            plans:      g.plans?.length ? g.plans : [""],
            timeline:   g.timeline   ?? "",
            personnel:  g.personnel  ?? "",
            metric:     g.metric     ?? "",
            remarks:    g.remarks    ?? "",
          }));
          setGoals(loadedGoals.length ? loadedGoals : [makeGoal()]);
          setIsEdit(true);
          showToast("Plan loaded — ready to edit.", "info");
        } else {
          const cu = data.current_user;
          if (cu?.name)       setPreparedBy(cu.name);
          if (cu?.department) setDepartment(cu.department);
          if (cu?.position)   setPreparedByTitle(cu.position);
          setGoals([makeGoal()]);
        }
        setLoading(false);

        // ── Fetch dept plan history ──────────────────────────────────────
        // After main load, fetch plans from the same department as current user
        fetch("php/strategic_plan_history.php")
          .then(r => r.ok ? r.json() : Promise.reject(new Error(`${r.status}`)))
          .then(histData => {
            setDeptPlans(histData.plans ?? []);
          })
          .catch(err => {
            console.warn("Could not load plan history:", err.message);
          })
          .finally(() => setLoadingHistory(false));
      })
      .catch(err => {
        console.error(err);
        setLoadErr(err.message);
        setLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addGoal    = () => setGoals(prev => [...prev, makeGoal()]);
  const removeGoal = id => setGoals(prev => prev.filter(g => g.id !== id));
  const updateGoal = (id, field, value) =>
    setGoals(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  const addPlan  = goalId =>
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, plans: [...g.plans, ""] } : g));
  const removePlan = (goalId, idx) =>
    setGoals(prev => prev.map(g =>
      g.id === goalId && g.plans.length > 1
        ? { ...g, plans: g.plans.filter((_, i) => i !== idx) }
        : g
    ));
  const updatePlan = (goalId, idx, value) =>
    setGoals(prev => prev.map(g =>
      g.id === goalId
        ? { ...g, plans: g.plans.map((p, i) => i === idx ? value : p) }
        : g
    ));

  const savePlan = async () => {
    if (!planTitle.trim() || !department.trim() || !vision.trim() || !mission.trim() ||
        !preparedBy.trim() || !notedByExecDir.trim() || !notedByPresident.trim()) {
      showToast("Please fill in all required fields.", "error"); return;
    }
    if (goals.length === 0) { showToast("Add at least one goal.", "error"); return; }
    if (goals.some(g => !g.goal.trim())) { showToast("Every goal needs a title.", "error"); return; }

    setSaving(true);
    try {
      const payload = {
        plan_title:         planTitle.trim(),
        department:         department.trim(),
        vision:             vision.trim(),
        mission:            mission.trim(),
        prepared_by:        preparedBy.trim(),
        prepared_by_title:  preparedByTitle.trim(),
        noted_by_exec_dir:  notedByExecDir.trim(),
        noted_by_president: notedByPresident.trim(),
        ...(URL_PLAN_ID > 0 ? { plan_id: URL_PLAN_ID } : {}),
        goals: goals.map(g => ({
          db_id:      g.dbId ?? null,
          goal:       g.goal.trim(),
          objectives: g.objectives.trim(),
          plans:      g.plans.filter(p => p.trim()),
          timeline:   g.timeline.trim(),
          personnel:  g.personnel.trim(),
          metric:     g.metric.trim(),
          remarks:    g.remarks.trim(),
        })),
      };

      const res  = await fetch("php/save_strategic_plan.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      showToast("Plan saved! Redirecting to preview…", "success");
      setTimeout(() => { window.location.href = data.redirect; }, 900);
    } catch (err) {
      console.error(err);
      showToast(`Save failed: ${err.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────
  if (loading) return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
        <div style={{
          padding: "24px 36px 20px", borderBottom: "1px solid var(--border)",
          background: "var(--paper)", display: "flex", alignItems: "center", gap: 16,
        }}>
          <Skeleton h={22} mb={0} />
        </div>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "28px 24px" }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: "var(--paper)", borderRadius: 16, border: "1px solid var(--border)", padding: 24, marginBottom: 20 }}>
              <Skeleton h={18} mb={16} />
              <Skeleton h={40} mb={10} />
              <Skeleton h={40} mb={0} />
            </div>
          ))}
        </div>
      </div>
    </>
  );

  if (loadErr) return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ fontFamily: "'DM Sans', sans-serif", padding: 36 }}>
        <div style={{
          background: "#FFF0EE", border: "1.5px solid #FACACA",
          borderRadius: 12, padding: "18px 22px", color: "var(--red)", fontSize: 14,
        }}>
          <strong style={{ fontWeight: 700 }}>Could not load plan data:</strong> {loadErr}
          <br />
          <button
            onClick={() => window.location.reload()}
            className="btn-primary"
            style={{ marginTop: 14, background: "var(--red)" }}
          >Retry</button>
        </div>
      </div>
    </>
  );

  // ── Render ────────────────────────────────────────────────────────
  return (
    <>
      <style>{GLOBAL_CSS}</style>

      {/* Page Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 36px", borderBottom: "1px solid var(--border)",
        background: "var(--paper)", position: "sticky", top: 0, zIndex: 50,
        backdropFilter: "blur(8px)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: "var(--navy)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 18 }}>📋</span>
          </div>
          <div>
            <h1 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 20, fontWeight: 700, color: "var(--navy)", lineHeight: 1.2,
              display: "flex", alignItems: "center", gap: 10,
            }}>
              {isEdit ? "Edit Strategic Plan" : "Create Strategic Plan"}
              {isEdit && (
                <span className="tag" style={{ background: "var(--indigo-lt)", color: "var(--indigo)", fontSize: 11 }}>
                  Plan #{URL_PLAN_ID}
                </span>
              )}
            </h1>
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, fontWeight: 300 }}>
              {isEdit
                ? "Update the plan below, then save to regenerate your Word document."
                : "Fill in the form below, save, then generate your Word document."}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <ProgressDots total={4} current={filledSections} />
          {isEdit && (
            <a
              href={`strategic-plan-preview.php?id=${URL_PLAN_ID}`}
              className="btn-ghost"
              style={{ textDecoration: "none", fontSize: 13 }}
            >
              👁 Preview
            </a>
          )}
        </div>
      </div>

      {/* Two-column layout: form + history sidebar */}
      <div style={{
        display: "flex",
        gap: 24,
        maxWidth: 1220,
        margin: "0 auto",
        padding: "28px 24px 100px",
        alignItems: "flex-start",
      }}>

      {/* Main form column */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* 1 — Document Info */}
        <SectionCard
          step="1"
          title="Document Info"
          subtitle="Title, department, and the person who prepared this plan"
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <Field label="Plan Title" required>
              <FocusInput type="text" value={planTitle} onChange={e => setPlanTitle(e.target.value)}
                placeholder="e.g. Strategic Plan 2026" />
            </Field>
            <Field label="Department / Unit" required>
              <FocusInput type="text" value={department} onChange={e => setDepartment(e.target.value)}
                placeholder="e.g. Management Information System" />
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Prepared By" required>
              <FocusInput type="text" value={preparedBy} onChange={e => setPreparedBy(e.target.value)}
                placeholder="Full name" />
            </Field>
            <Field label="Title / Position">
              <FocusInput type="text" value={preparedByTitle} onChange={e => setPreparedByTitle(e.target.value)}
                placeholder="e.g. M.I.S Coordinator" />
            </Field>
          </div>
        </SectionCard>



        {/* 3 — Vision & Mission */}
        <SectionCard
          step="2"
          title="Vision & Mission"
          subtitle="Defines the purpose and direction of the department"
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Vision" required>
              <FocusTextarea rows={4} value={vision} onChange={e => setVision(e.target.value)}
                placeholder="Where the department wants to be in the future…" />
            </Field>
            <Field label="Mission" required>
              <FocusTextarea rows={4} value={mission} onChange={e => setMission(e.target.value)}
                placeholder="What the department does and how it serves the organization…" />
            </Field>
          </div>
        </SectionCard>

        {/* 4 — Strategic Goals */}
        <SectionCard
          step="3"
          title="Strategic Goals"
          subtitle="Each goal becomes one row in the plan table"
          badge={
            deptUsers.length > 0 && (
              <span className="tag" style={{ background: "var(--green-lt)", color: "var(--green)", fontSize: 12 }}>
                 {deptUsers.length} dept. user{deptUsers.length !== 1 ? "s" : ""}
              </span>
            )
          }
        >
          {goals.length === 0 ? (
            <div style={{
              textAlign: "center", color: "var(--muted)",
              padding: "32px 0 24px", fontSize: 14, fontWeight: 300,
            }}>
              No goals yet — click <strong style={{ fontWeight: 600, color: "var(--navy)" }}>Add Goal</strong> below to start.
            </div>
          ) : (
            goals.map((g, i) => (
              <GoalCard
                key={g.id} goal={g} index={i}
                deptUsers={deptUsers}
                onRemove={removeGoal}
                onUpdate={updateGoal}
                onAddPlan={addPlan}
                onRemovePlan={removePlan}
                onUpdatePlan={updatePlan}
              />
            ))
          )}
          <button className="btn-add" onClick={addGoal} style={{ marginTop: 8 }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
            Add {goals.length > 0 ? "Another " : ""}Goal
          </button>
        </SectionCard>


                {/* 2 — Noted By */}
        <SectionCard
          step="4"
          title="Noted By"
          subtitle="Authorized signatories who have reviewed and noted this plan"
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <Field label="Executive Director" required>
              <FocusInput
                type="text" value={notedByExecDir}
                onChange={e => setNotedByExecDir(e.target.value)}
                placeholder="Executive Director name"
              />
              <div className="field-hint">Executive Director</div>
            </Field>
            <Field label="President" required>
              <FocusInput
                type="text" value={notedByPresident}
                onChange={e => setNotedByPresident(e.target.value)}
                placeholder="President name"
              />
              <div className="field-hint">President, RPsy, CSAP, PhD</div>
            </Field>
          </div>
        </SectionCard>

      </div>{/* end main form column */}

        {/* History Sidebar */}
        <PlanHistorySidebar
          deptPlans={deptPlans}
          loadingHistory={loadingHistory}
          currentPlanId={URL_PLAN_ID}
        />

      </div>{/* end two-column layout */}
      <div className="save-bar">
        <div style={{ display: "flex", align: "center", gap: 16 }}>
          <div style={{ color: "#94A3B8", fontSize: 13 }}>
            <strong style={{ color: "#E2E8F0", fontWeight: 600 }}>
              {goals.length} goal{goals.length !== 1 ? "s" : ""}
            </strong>
            {"  ·  "}
            {isEdit
              ? <span style={{ color: "#818CF8" }}>Editing Plan #{URL_PLAN_ID}</span>
              : <span style={{ fontWeight: 300 }}>Fill in the form, then save to continue</span>}
          </div>
          <ProgressDots total={4} current={filledSections} />
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {isEdit && (
            <a
              href={`strategic-plan-preview.php?id=${URL_PLAN_ID}`}
              className="btn-ghost"
              style={{
                textDecoration: "none", color: "#A5B4FC",
                borderColor: "rgba(165,180,252,.3)",
                background: "rgba(255,255,255,.05)",
              }}
            >
              Cancel
            </a>
          )}
          <button
            className="btn-primary"
            onClick={savePlan}
            disabled={saving}
            style={{ padding: "11px 28px", fontSize: 14 }}
          >
            {saving
              ? <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,.4)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                  Saving…
                </span>
              : isEdit ? "Save Changes" : "Save Plan"}
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <Toast message={toast.message} type={toast.type} />
    </>
  );
}

// ── Mount ─────────────────────────────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<StrategicPlanGenerator />);