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
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 15, marginBottom: 6 }}>
          <img src="../imgs/psi.png" style={{ width: 60 }} />
          <div style={{ textAlign: "left" }}>
            <div style={companyStyle}>Psi Systems and Innovations, OPC</div>
            <div style={taglineStyle}>Your development is our achievement!</div>
          </div>
        </div>

        {/* SINGLE RED LINE */}
        <hr style={{ border: "none", borderTop: "2px solid #bb0000", margin: "0 0 16px 0" }} />

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

        {/* SIGNATURES — no box/table, just label above and name+title below a line */}
        <div style={signatureRow}>
          <Signature name={plan.prepared_by}       subtitle={plan.prepared_by_title}      label="Prepared By:" />
          <Signature name={plan.noted_by_exec_dir}  subtitle="Executive Director"          label="Noted By:" />
          <Signature name={plan.noted_by_president} subtitle="President, RPsy, CSAP, PhD"  label="Noted By:" />
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
    script.src = "https://unpkg.com/docx@7.8.2/build/index.js";
    script.onload = () => window.docx ? resolve(window.docx) : reject(new Error("docx loaded but window.docx is undefined"));
    script.onerror = () => reject(new Error("Failed to load docx library from CDN"));
    document.head.appendChild(script);
  });
}

/* ─── FETCH LOGO AS UINT8ARRAY FOR DOCX ─── */
async function fetchLogoBytes() {
  try {
    const res = await fetch("../imgs/psi.png");
    if (!res.ok) throw new Error("logo not found");
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null; // logo unavailable — skip silently
  }
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
    ImageRun, Header,
  } = docxLib;

  // ── Layout constants ─────────────────────────────────────────────
  const PAGE_W    = 11906;
  const PAGE_H    = 16838;
  const MARGIN    = 720;                    // 0.5 inch sides & bottom
  const TOP_MARGIN = 1440;                  // 1 inch top — gives header room
  const CONTENT_W = PAGE_H - MARGIN * 2;   // 15398 DXA landscape content width

  const COL_WIDTHS = [3200, 3200, 1500, 1700, 2900, 2898]; // sum = 15398

  // ── Border helpers ───────────────────────────────────────────────
  const solidBorder = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  const allBorders  = { top: solidBorder, bottom: solidBorder, left: solidBorder, right: solidBorder };
  const noBorders   = {
    top:    { style: BorderStyle.NONE },
    bottom: { style: BorderStyle.NONE },
    left:   { style: BorderStyle.NONE },
    right:  { style: BorderStyle.NONE },
  };
  const noTableBorders = { ...noBorders, insideH: { style: BorderStyle.NONE }, insideV: { style: BorderStyle.NONE } };

  // ── Cell/paragraph helpers ───────────────────────────────────────
  const CELL_MARGINS = { top: 80, bottom: 80, left: 120, right: 120 };

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
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text, bold: true, color: "000000", size: 18 })],
      })],
    });

  const p = (text, opts = {}) =>
    new Paragraph({ children: [new TextRun({ text: text || "", size: 20, ...opts })] });

  const numP = (text, ref) =>
    new Paragraph({
      numbering: { reference: ref, level: 0 },
      children: [new TextRun({ text: text || "", size: 20 })],
    });

  // ── Numbered list configs ────────────────────────────────────────
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

  // ── Build data table rows ────────────────────────────────────────
  const tableHeaderRow = new TableRow({
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

    const col0Children = [
      new Paragraph({ children: [new TextRun({ text: `Goal: ${g.goal || ""}`, bold: true, size: 20 })] }),
      new Paragraph({ children: [new TextRun({ text: "" })] }),
      new Paragraph({ children: [new TextRun({ text: "Objectives:", bold: true, size: 20 })] }),
      ...(objLines.length ? objLines.map(o => numP(o, `obj-${gi}`)) : [p("")]),
    ];

    const col1Children = planLines.length
      ? planLines.map(pl => numP(pl, `plan-${gi}`))
      : [p("")];

    const linesOrBlank = (lines) => lines.length ? lines.map(l => p(l)) : [p("")];

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

  // ── Signature block — NO visible table, plain paragraphs ─────────
  // Three columns side by side using a borderless table so they align,
  // but with all table/cell borders set to NONE so nothing is visible.
  const SIG_COL = Math.round(CONTENT_W / 3);

  const makeSigCell = (label, name, subtitle) =>
    new TableCell({
      borders: noBorders,
      width: { size: SIG_COL, type: WidthType.DXA },
      margins: { top: 0, bottom: 0, left: 200, right: 200 },
      children: [
        // Label line (e.g. "Prepared By:")
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 560 },
          children: [new TextRun({ text: label, size: 18 })],
        }),
        // Name with a top border as the signature line
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 40 },
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 1 } },
          children: [new TextRun({ text: name || "", bold: true, size: 20 })],
        }),
        // Position/subtitle
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
          children: [new TextRun({ text: subtitle || "", size: 18 })],
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
          makeSigCell("Prepared By:",  plan.prepared_by,        plan.prepared_by_title || ""),
          makeSigCell("Noted By:",     plan.noted_by_exec_dir,  "Executive Director"),
          makeSigCell("Noted By:",     plan.noted_by_president, "President, RPsy, CSAP, PhD"),
        ],
      }),
    ],
  });

  // ── Fetch logo ────────────────────────────────────────────────────
  const logoBytes = await fetchLogoBytes();

  // ── Page header — repeats on every page ──────────────────────────
  // Logo + company name/tagline in a borderless 2-col table, then single red rule

  const logoColW = 900;
  const textColW = CONTENT_W - logoColW;

  const logoCell = new TableCell({
    borders: noBorders,
    width: { size: logoColW, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 0, bottom: 0, left: 0, right: 160 },
    children: [
      logoBytes
        ? new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new ImageRun({ data: logoBytes, transformation: { width: 55, height: 55 } })],
          })
        : new Paragraph(""),
    ],
  });

  const nameCell = new TableCell({
    borders: noBorders,
    width: { size: textColW, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    children: [
      new Paragraph({
        spacing: { before: 0, after: 20 },
        children: [new TextRun({
          text: "Psy Systems and Innovations, OPC",
          font: "Matura MT Script Capitals",
          size: 36,
          color: "BB0000",
          bold: true,
        })],
      }),
      new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [new TextRun({
          text: "Your development is our achievement!",
          font: "Harlow Solid Italic",
          size: 22,
          color: "BB0000",
          italics: true,
        })],
      }),
    ],
  });

  const letterheadTable = new Table({
    width: { size: CONTENT_W, type: WidthType.DXA },
    columnWidths: [logoColW, textColW],
    borders: noTableBorders,
    rows: [new TableRow({ children: [logoCell, nameCell] })],
  });

  // Single red rule paragraph
  const redRule = new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "BB0000", space: 1 } },
    spacing: { before: 60, after: 0 },
    children: [new TextRun({ text: "" })],
  });

  const pageHeader = new Header({
    children: [letterheadTable, redRule],
  });

  // ── Assemble document ────────────────────────────────────────────
  const doc = new Document({
    numbering: { config: makeNumberingConfig(plan.goals) },
    sections: [{
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
        // Plan title
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 160, after: 0 },
          children: [new TextRun({ text: plan.plan_title || "Strategic Plan 2026", bold: true, size: 28 })],
        }),
        // Department
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 200 },
          children: [new TextRun({ text: plan.department || "", size: 24 })],
        }),
        // Vision
        new Paragraph({
          spacing: { before: 0, after: 80 },
          children: [
            new TextRun({ text: "Vision: ", bold: true, size: 22 }),
            new TextRun({ text: plan.vision || "", size: 22 }),
          ],
        }),
        // Mission
        new Paragraph({
          spacing: { before: 0, after: 200 },
          children: [
            new TextRun({ text: "Mission: ", bold: true, size: 22 }),
            new TextRun({ text: plan.mission || "", size: 22 }),
          ],
        }),
        // Main table
        new Table({
          width: { size: CONTENT_W, type: WidthType.DXA },
          columnWidths: COL_WIDTHS,
          rows: [tableHeaderRow, ...dataRows],
        }),
        // Spacer
        new Paragraph({ children: [new TextRun({ text: "" })] }),
        new Paragraph({ children: [new TextRun({ text: "" })] }),
        // Signatures
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
  fontFamily: "'Matura MT Script Capitals', 'Brush Script MT', cursive",
  fontWeight: "bold",
  color: "#bb0000",
};

const taglineStyle = {
  fontSize: 14,
  fontFamily: "'Harlow Solid Italic', 'Dancing Script', cursive",
  fontStyle: "italic",
  color: "#bb0000",
};

const titleStyle = {
  fontSize: 13,
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
  textAlign: "center",
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

/* ─── SIGNATURE COMPONENT — no visible box, label above, name+title below a line ─── */
function Signature({ name, subtitle, label }) {
  return (
    <div style={{ textAlign: "center", minWidth: 200 }}>
      <div style={{ fontSize: 12, marginBottom: 44 }}>{label}</div>
      <div style={{
        borderTop: "1px solid black",
        paddingTop: 5,
        display: "inline-block",
        minWidth: 200,
      }}>
        <strong>{name}</strong>
        <div style={{ fontSize: 12 }}>{subtitle}</div>
      </div>
    </div>
  );
}

/* ─── MOUNT ─── */
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<StrategicPlanPreview />);