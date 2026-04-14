const { useState, useEffect } = React;

const headers = [
  "Specific Goals and Objectives",
  "Detailed Plan",
  "Specific Timeline",
  "Lead Personnel",
  "Metric For Success",
  "Remarks (Evaluation)"
];

function StrategicPlanPreview() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  const planId = new URLSearchParams(window.location.search).get("id");

  // Preload docx library in background so it's ready when the button is clicked
  useEffect(() => { loadDocxLib().catch(() => {}); }, []);

  useEffect(() => {
    fetch(`php/get_strategic_plan.php?id=${planId}`)
      .then(res => res.json())
      .then(data => setPlan(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40 }}>Loading...</div>;

  return (
    <div style={outerContainer}>
      <div style={pageContainer}>

        {/* HEADER WITH LOGO */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 15, marginBottom: 30 }}>
          <img src="../imgs/psi.png" style={{ width: 60 }} />
          <div style={{ textAlign: "left" }}>
            <div style={companyStyle}>Psy Systems and Innovations, OPC</div>
            <div style={taglineStyle}>Your development is our achievement!</div>
          </div>
        </div>

        {/* TITLE */}
        <div style={{ textAlign: "center" }}>
          <div style={titleStyle}>Strategic Plan 2026</div>
          <div style={subtitleStyle}>{plan.department}</div>
        </div>

        {/* VISION & MISSION */}
        <div style={sectionStyle}>
          <p><strong>Vision:</strong> {plan.vision}</p>
          <p><strong>Mission:</strong> {plan.mission}</p>
        </div>

        {/* TABLE */}
        <table style={tableStyle}>
          <thead>
            <tr>
              {headers.map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {plan.goals.map((g, i) => (
              <tr key={i}>
                <td style={tdStyle}>
                  <strong>Goal: {g.goal}</strong>
                  <br /><br />
                  <strong>Objective:</strong>
                  <ol>
                    {splitLines(g.objectives).map((o, i) => <li key={i}>{o}</li>)}
                  </ol>
                </td>
                <td style={tdStyle}>
                  <ol>
                    {(g.plans || []).map((p, i) => <li key={i}>{p}</li>)}
                  </ol>
                </td>
                <td style={tdStyle}>
                  {splitLines(g.timeline).map((t, i) => <div key={i}>{t}</div>)}
                </td>
                <td style={tdStyle}>
                  {splitLines(g.personnel).map((p, i) => <div key={i}>{p}</div>)}
                </td>
                <td style={tdStyle}>
                  {splitLines(g.metric).map((m, i) => <div key={i}>{m}</div>)}
                </td>
                <td style={tdStyle}>
                  {splitLines(g.remarks).map((r, i) => <div key={i}>{r}</div>)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* SIGNATURES */}
        <div style={signatureRow}>
          <Signature name={plan.prepared_by} subtitle={plan.prepared_by_title} label="Prepared By" />
          <Signature name={plan.noted_by_exec_dir} subtitle="Executive Director" label="Noted By" />
          <Signature name={plan.noted_by_president} subtitle="President, RPsy, CSAP, PhD" label="Noted By" />
        </div>

        {/* DOWNLOAD BUTTON */}
        <div style={{ textAlign: "center", marginTop: 40 }}>
          <button style={btnStyle} onClick={() => generateDoc(plan)}>
            ⬇ Download as DOCX
          </button>
        </div>

      </div>
    </div>
  );
}

/* ─── HELPERS ─── */
function splitLines(text) {
  return text ? text.split("\n").filter(Boolean) : [];
}

/* ─── DOCX LIBRARY LOADER ─── */
function loadDocxLib() {
  if (window.docx) return Promise.resolve(window.docx);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    // v7.8.2 is the last version with a webpack UMD build that reliably sets window.docx
    script.src = "https://unpkg.com/docx@7.8.2/build/index.js";
    script.onload = () => window.docx ? resolve(window.docx) : reject(new Error("docx loaded but window.docx is undefined"));
    script.onerror = () => reject(new Error("Failed to load docx library from CDN"));
    document.head.appendChild(script);
  });
}

/* ─── DOCX GENERATOR ─── */
async function generateDoc(plan) {
  const docxLib = await loadDocxLib();
  const {
    Document, Packer, Paragraph, TextRun,
    Table, TableRow, TableCell,
    WidthType, BorderStyle, AlignmentType,
    ShadingType, VerticalAlign,
    PageOrientation, LevelFormat,
  } = docxLib;

  // ── Layout constants ─────────────────────────────────────────────
  // A4 landscape: pass portrait dims, docx-js swaps them
  // Landscape content width = long edge − margins = 16838 − 720 − 720 = 15398 DXA
  const PAGE_W   = 11906;
  const PAGE_H   = 16838;
  const MARGIN   = 720; // 0.5 inch
  const CONTENT_W = PAGE_H - MARGIN * 2; // 15398 DXA (landscape content width)

  // 6 columns — distribute content width
  // Col 1 (Goals+Objectives) gets more space
  const COL_WIDTHS = [3200, 3200, 1500, 1700, 2900, 2898];
  // sum = 15398

  // ── Shared border style ──────────────────────────────────────────
  const border = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  const allBorders = { top: border, bottom: border, left: border, right: border };
  const noBorders  = {
    top:    { style: BorderStyle.NONE },
    bottom: { style: BorderStyle.NONE },
    left:   { style: BorderStyle.NONE },
    right:  { style: BorderStyle.NONE },
  };

  // ── Cell helpers ─────────────────────────────────────────────────
  const CELL_MARGINS = { top: 80, bottom: 80, left: 120, right: 120 };

  // Plain text cell
  const makeCell = (children, colIdx, options = {}) =>
    new TableCell({
      borders: allBorders,
      width: { size: COL_WIDTHS[colIdx], type: WidthType.DXA },
      margins: CELL_MARGINS,
      verticalAlign: VerticalAlign.TOP,
      ...options,
      children,
    });

  // Header cell (shaded)
  const makeHeaderCell = (text, colIdx) =>
    new TableCell({
      borders: allBorders,
      width: { size: COL_WIDTHS[colIdx], type: WidthType.DXA },
      margins: CELL_MARGINS,
      shading: { fill: "1F3864", type: ShadingType.CLEAR },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true, color: "FFFFFF", size: 18 })],
      })],
    });

  // Text paragraph helper (size in half-points, e.g. 20 = 10pt)
  const p = (text, opts = {}) =>
    new Paragraph({ children: [new TextRun({ text: text || "", size: 20, ...opts })] });

  // Numbered list paragraph using docx-js numbering
  const numP = (text, ref) =>
    new Paragraph({
      numbering: { reference: ref, level: 0 },
      children: [new TextRun({ text: text || "", size: 20 })],
    });

  // ── Numbered list configs ─────────────────────────────────────────
  // One unique reference per goal to reset numbering per cell
  const makeNumberingConfig = (goals) =>
    goals.flatMap((_, i) => [
      {
        reference: `obj-${i}`,
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360, hanging: 260 } } },
        }],
      },
      {
        reference: `plan-${i}`,
        levels: [{
          level: 0, format: LevelFormat.DECIMAL, text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360, hanging: 260 } } },
        }],
      },
    ]);

  // ── Build table rows ──────────────────────────────────────────────
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h, i) => makeHeaderCell(h, i)),
  });

  const dataRows = plan.goals.map((g, gi) => {
    const objLines  = splitLines(g.objectives);
    const planLines = splitLines(g.plans ? g.plans.join("\n") : "");
    const timeLines = splitLines(g.timeline);
    const persLines = splitLines(g.personnel);
    const metLines  = splitLines(g.metric);
    const remLines  = splitLines(g.remarks);

    // Col 0: Goal + Objectives
    const col0Children = [
      new Paragraph({ children: [new TextRun({ text: `Goal: ${g.goal || ""}`, bold: true, size: 20 })] }),
      new Paragraph({ children: [new TextRun({ text: "" })] }),
      new Paragraph({ children: [new TextRun({ text: "Objectives:", bold: true, size: 20 })] }),
      ...(objLines.length
        ? objLines.map(o => numP(o, `obj-${gi}`))
        : [p("")]),
    ];

    // Col 1: Detailed Plan (numbered)
    const col1Children = planLines.length
      ? planLines.map(pl => numP(pl, `plan-${gi}`))
      : [p("")];

    // Col 2–5: simple line-by-line
    const linesOrBlank = (lines) =>
      lines.length ? lines.map(l => p(l)) : [p("")];

    return new TableRow({
      children: [
        makeCell(col0Children, 0),
        makeCell(col1Children, 1),
        makeCell(linesOrBlank(timeLines), 2),
        makeCell(linesOrBlank(persLines), 3),
        makeCell(linesOrBlank(metLines),  4),
        makeCell(linesOrBlank(remLines),  5),
      ],
    });
  });

  // ── Signature helper ─────────────────────────────────────────────
  const signatureCell = (name, subtitle, label, colW) =>
    new TableCell({
      borders: noBorders,
      width: { size: colW, type: WidthType.DXA },
      margins: CELL_MARGINS,
      children: [
        // Signature underline via paragraph border
        new Paragraph({
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 1 } },
          children: [new TextRun({ text: " " })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: name || "", bold: true, size: 20 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: subtitle || "", italics: true, size: 18 })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: label, size: 18 })],
        }),
      ],
    });

  // 3-column signature table with gaps
  const SIG_W  = 4000;
  const GAP_W  = (CONTENT_W - SIG_W * 3) / 2; // space between the 3 signature blocks

  const sigGapCell = (w) =>
    new TableCell({
      borders: noBorders,
      width: { size: Math.round(w), type: WidthType.DXA },
      children: [new Paragraph("")],
    });

  const sigTable = new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [SIG_W, Math.round(GAP_W), SIG_W, Math.round(GAP_W), SIG_W],
    rows: [
      new TableRow({
        children: [
          signatureCell(plan.prepared_by,       plan.prepared_by_title, "Prepared By",   SIG_W),
          sigGapCell(GAP_W),
          signatureCell(plan.noted_by_exec_dir, "Executive Director",   "Noted By",      SIG_W),
          sigGapCell(GAP_W),
          signatureCell(plan.noted_by_president,"President, RPsy, CSAP, PhD", "Noted By", SIG_W),
        ],
      }),
    ],
  });

  // ── Assemble document ────────────────────────────────────────────
  const doc = new Document({
    numbering: {
      config: makeNumberingConfig(plan.goals),
    },
    sections: [{
      properties: {
        page: {
          size: {
            width: PAGE_W,
            height: PAGE_H,
            orientation: PageOrientation.LANDSCAPE,
          },
          margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
        },
      },
      children: [
        // Company name
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Psy Systems and Innovations, OPC", bold: true, size: 28, color: "BB0000" })],
        }),
        // Tagline
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Your development is our achievement!", italics: true, bold: true, size: 22, color: "09003F" })],
        }),

        new Paragraph(""),

        // Plan title
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Strategic Plan 2026", bold: true, size: 28 })],
        }),
        // Department
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: plan.department || "", size: 24 })],
          spacing: { after: 200 },
        }),

        // Vision
        new Paragraph({
          children: [
            new TextRun({ text: "Vision: ", bold: true, size: 22 }),
            new TextRun({ text: plan.vision || "", size: 22 }),
          ],
          spacing: { after: 80 },
        }),
        // Mission
        new Paragraph({
          children: [
            new TextRun({ text: "Mission: ", bold: true, size: 22 }),
            new TextRun({ text: plan.mission || "", size: 22 }),
          ],
          spacing: { after: 200 },
        }),

        // Main table
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: COL_WIDTHS,
          rows: [headerRow, ...dataRows],
        }),

        new Paragraph(""),
        new Paragraph(""),

        // Signature table
        sigTable,
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  const link = document.createElement("a");
  link.href  = URL.createObjectURL(blob);
  link.download = `Strategic_Plan_${(plan.department || "").replace(/\s+/g, "_") || "export"}.docx`;
  link.click();
}

/* ─── STYLES ─── */
const outerContainer = {
  background: "#e5e5e5",
  padding: "30px 0",
  minHeight: "100vh",
};

const pageContainer = {
  width: "1123px",
  minHeight: "794px",
  margin: "0 auto",
  background: "#fff",
  padding: "40px 50px",
  boxShadow: "0 0 10px rgba(0,0,0,0.15)",
  fontFamily: "Times New Roman, serif",
  color: "#000",
};

const companyStyle = {
  fontSize: 25,
  fontWeight: "bold",
  color: "#bb0000",
};

const taglineStyle = {
  fontSize: 18,
  fontStyle: "italic",
  fontWeight: "bold",
  color: "#09003f",
};

const titleStyle = {
  fontSize: 14,
  fontWeight: "bold",
  marginTop: 13,
};

const subtitleStyle = { fontSize: 13 };

const sectionStyle = {
  marginBottom: 20,
  fontSize: 13,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const thStyle = {
  border: "1px solid black",
  padding: 8,
  fontWeight: "bold",
  textAlign: "center"
};

const tdStyle = {
  border: "1px solid black",
  padding: 8,
  verticalAlign: "top",
};

const signatureRow = {
  marginTop: 60,
  display: "flex",
  justifyContent: "space-between",
};

const btnStyle = {
  padding: "10px 24px",
  fontSize: 14,
  cursor: "pointer",
  background: "#1F3864",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  fontWeight: "bold",
};

function Signature({ name, subtitle, label }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ borderBottom: "1px solid black", width: 200, marginBottom: 5 }}></div>
      <strong>{name}</strong>
      <div>{subtitle}</div>
      <div>{label}</div>
    </div>
  );
}

/* ─── HELPERS ─── (redeclared below for module scope) ─── */
// splitLines already declared above

/* ─── MOUNT ─── */
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<StrategicPlanPreview />);