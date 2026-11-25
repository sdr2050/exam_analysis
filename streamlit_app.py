import html
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import streamlit as st

# ---------------------------------------------------------------------------
# Page Configuration & Styling
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="EXAM ANALYSIS — CBSE Gazette Performance & Result Workbench",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
    <style>
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@600;700;800&family=Public+Sans:wght@400;500;600&display=swap');

      html, body, [class*="css"] {
        font-family: 'Public Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      }
      h1, h2, h3, h4 {
        font-family: 'Plus Jakarta Sans', 'Public Sans', sans-serif !important;
        letter-spacing: -0.015em;
      }
      [data-testid="stMetricValue"] {
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-variant-numeric: tabular-nums;
      }
      .block-container {
        padding-top: 1.5rem;
        padding-bottom: 2.5rem;
        max-width: 1320px;
      }
      .report-banner {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 10px;
        padding: 1.25rem 1.5rem;
        margin-bottom: 1.25rem;
      }
      .report-kicker {
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #1D4ED8;
        margin-bottom: 0.25rem;
      }
      .report-title {
        font-family: 'Plus Jakarta Sans', sans-serif;
        font-size: 1.45rem;
        font-weight: 700;
        color: #0F172A;
        margin: 0 0 0.35rem 0;
      }
      .report-meta {
        font-size: 0.82rem;
        color: #475569;
        font-family: 'IBM Plex Mono', monospace;
      }
      .insight-card {
        background: #FFFFFF;
        border: 1px solid #E2E8F0;
        border-radius: 8px;
        padding: 0.9rem 1rem;
        height: 100%;
      }
      .insight-positive {
        background: #F0FDF4;
        border-color: #BBF7D0;
      }
      .insight-highlight {
        background: #EFF6FF;
        border-color: #BFDBFE;
      }
      .insight-warning {
        background: #FFFBEB;
        border-color: #FDE68A;
      }
      .insight-title {
        font-weight: 700;
        font-size: 0.85rem;
        color: #0F172A;
        margin-bottom: 0.3rem;
      }
      .insight-body {
        font-size: 0.82rem;
        color: #334155;
        line-height: 1.45;
      }
    </style>
    """,
    unsafe_allow_html=True,
)

# ---------------------------------------------------------------------------
# Constants & Subject Dictionary
# ---------------------------------------------------------------------------
CBSE_SUBJECT_CODES: Dict[str, str] = {
    "001": "English_Elective",
    "002": "Hindi_Elective",
    "027": "History",
    "028": "Political_Science",
    "029": "Geography",
    "030": "Economics",
    "037": "Psychology",
    "039": "Sociology",
    "041": "Mathematics",
    "042": "Physics",
    "043": "Chemistry",
    "044": "Biology",
    "048": "Physical_Education",
    "049": "Painting",
    "054": "Business_Studies",
    "055": "Accountancy",
    "064": "Home_Science",
    "065": "Informatics_Practices",
    "083": "Computer_Science",
    "241": "Applied_Mathematics",
    "301": "English_Core",
    "302": "Hindi_Core",
    "322": "Sanskrit_Core",
}

STANDARD_GRADES: List[str] = ["A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2", "E"]

BAND_ORDER: List[str] = [
    "90% & Above",
    "75% - 89.9% (Distinction)",
    "60% - 74.9%",
    "50% - 59.9%",
    "Below 50%",
]

BAND_COLORS: Dict[str, str] = {
    "90% & Above": "#059669",
    "75% - 89.9% (Distinction)": "#2563EB",
    "60% - 74.9%": "#4F46E5",
    "50% - 59.9%": "#D97706",
    "Below 50%": "#E11D48",
}

GRADE_COLORS: Dict[str, str] = {
    "A1": "#059669",
    "A2": "#10B981",
    "B1": "#2563EB",
    "B2": "#3B82F6",
    "C1": "#F59E0B",
    "C2": "#D97706",
    "D1": "#F97316",
    "D2": "#EA580C",
    "E": "#E11D48",
}

DEMO_FILE_PATH = Path(__file__).parent / "demo_gazette_00000.txt"


def subject_display_name(code: str) -> str:
    return CBSE_SUBJECT_CODES.get(code, f"Subject_{code}").replace("_", " ")


def classify_band(pct: Optional[float]) -> str:
    if pct is None or pd.isna(pct):
        return "Pending / R.L."
    if pct >= 90:
        return "90% & Above"
    if pct >= 75:
        return "75% - 89.9% (Distinction)"
    if pct >= 60:
        return "60% - 74.9%"
    if pct >= 50:
        return "50% - 59.9%"
    return "Below 50%"


# ---------------------------------------------------------------------------
# Gazette Parser & Subject Analysis Engine (Python-Exact Schema)
# ---------------------------------------------------------------------------
@st.cache_data(show_spinner=False)
def parse_cbse_gazette_text(
    text: str, filename: str
) -> Tuple[pd.DataFrame, pd.DataFrame, List[str], Dict[str, str]]:
    """Parse a CBSE School/Roll-No-wise Gazette .TXT string into complete & subject DataFrames."""
    lines = text.splitlines()

    date_m = re.search(r"DATE:-\s*(\S+)", text, re.IGNORECASE)
    region_m = re.search(r"REGION:\s*([A-Z0-9\-]+)", text, re.IGNORECASE)
    school_m = re.search(r"SCHOOL\s*:\s*-\s*(\d+)\s+([^\r\n]+)", text, re.IGNORECASE)
    exam_m = re.search(
        r"(C\.B\.S\.E\.\s*-[^\r\n]+?)(?=\s+REGION|\s+PAGE|\r|\n|$)", text, re.IGNORECASE
    ) or re.search(
        r"DATE:-\s*\S+\s+([^\r\n]+?)(?=\s+REGION|\s+PAGE|\r|\n|$)", text, re.IGNORECASE
    )

    exam_date = date_m.group(1).strip() if date_m else "N/A"
    region = region_m.group(1).strip() if region_m else "N/A"
    school_code = school_m.group(1).strip() if school_m else "Unknown"
    school_name = school_m.group(2).strip() if school_m else "CBSE Affiliated School"
    exam_title = exam_m.group(1).strip() if exam_m else "SENIOR SCHOOL CERTIFICATE EXAMINATION"

    metadata = {
        "file_name": filename,
        "exam_date": exam_date,
        "region": region,
        "school_code": school_code,
        "school_name": school_name,
        "exam_title": exam_title,
    }

    raw_records = []
    all_subject_codes = set()
    i = 0

    while i < len(lines):
        line = lines[i].rstrip()
        match = re.match(
            r"^(\d{8})\s+([A-Z]?)\s+([MF])\s+([A-Z.\s]+?)\s+(\d{3}\s+.*)$", line
        )
        if match:
            roll_no = match.group(1)
            gender = match.group(3)
            name = re.sub(r"\s+", " ", match.group(4).strip())
            rest_tokens = match.group(5).strip().split()

            sub_codes: List[str] = []
            idx = 0
            while idx < len(rest_tokens) and re.match(r"^\d{3}$", rest_tokens[idx]):
                sub_codes.append(rest_tokens[idx])
                all_subject_codes.add(rest_tokens[idx])
                idx += 1

            remaining = rest_tokens[idx:]
            if len(remaining) >= 4 and re.match(r"^[A-E]\d$", remaining[0]):
                gr1, gr2, gr3 = remaining[0], remaining[1], remaining[2]
                res_tokens = remaining[3:]
            else:
                gr1, gr2, gr3 = "", "", ""
                res_tokens = remaining

            result = res_tokens[0] if res_tokens else ""
            comp_sub = " ".join(res_tokens[1:]) if len(res_tokens) > 1 else ""

            marks_line = lines[i + 1].strip() if i + 1 < len(lines) else ""
            mks_pairs = re.findall(
                r"(\d{3}|AB|ABS)(?:\s+([A-D]\d|E\d?))?(?=\s|$)", marks_line
            )

            sub_dict: Dict[str, Tuple[Optional[float], str]] = {}
            if len(mks_pairs) == len(sub_codes):
                for code, (mk, gr) in zip(sub_codes, mks_pairs):
                    mk_val = int(mk) if mk.isdigit() else np.nan
                    sub_dict[code] = (mk_val, gr or ("AB" if not mk.isdigit() else ""))
            else:
                for code in sub_codes:
                    sub_dict[code] = (np.nan, "R.L." if result == "R.L." else "")

            raw_records.append(
                {
                    "School_Code": school_code,
                    "School_Name": school_name,
                    "Region": region,
                    "Exam_Date": exam_date,
                    "Roll_No": roll_no,
                    "Candidate_Name": name,
                    "Gender": gender,
                    "Result": result,
                    "Compartment_Sub": comp_sub,
                    "Internal_Grade_1": gr1,
                    "Internal_Grade_2": gr2,
                    "Internal_Grade_3": gr3,
                    "Subjects": sub_dict,
                    "Sub_Codes": sub_codes,
                }
            )
            i += 2
        else:
            i += 1

    if not raw_records:
        return pd.DataFrame(), pd.DataFrame(), [], metadata

    sorted_codes = sorted(
        all_subject_codes,
        key=lambda c: (0 if c in ("301", "302", "001", "002") else 1, c),
    )

    rows = []
    for rec in raw_records:
        row = {k: v for k, v in rec.items() if k not in ("Subjects", "Sub_Codes")}
        sub_dict = rec["Subjects"]

        for code in sorted_codes:
            sub_name = CBSE_SUBJECT_CODES.get(code, f"Subject_{code}")
            prefix = f"{code}_{sub_name}"
            if code in sub_dict:
                row[f"{prefix}_Marks"] = sub_dict[code][0]
                row[f"{prefix}_Grade"] = sub_dict[code][1]
            else:
                row[f"{prefix}_Marks"] = np.nan
                row[f"{prefix}_Grade"] = ""

        marks_list = [v[0] for v in sub_dict.values() if pd.notna(v[0])]
        if marks_list:
            n_subs = len(marks_list)
            total_all = int(sum(marks_list))
            pct_all = round((total_all / (n_subs * 100)) * 100, 2)

            top_5 = sorted(marks_list, reverse=True)[:5]
            total_5 = int(sum(top_5))
            pct_5 = round((total_5 / (len(top_5) * 100)) * 100, 2)

            row["Total_Marks_All"] = total_all
            row["Percentage_All"] = pct_all
            row["Best5_Total_500"] = total_5
            row["Best5_Percentage"] = pct_5
        else:
            row["Total_Marks_All"] = np.nan
            row["Percentage_All"] = np.nan
            row["Best5_Total_500"] = np.nan
            row["Best5_Percentage"] = np.nan

        row["Performance_Band"] = classify_band(row["Best5_Percentage"])
        row["Subject_Combo"] = " + ".join(
            f"{c} ({subject_display_name(c)})" for c in rec["Sub_Codes"]
        )
        rows.append(row)

    df = pd.DataFrame(rows)
    df["Rank_Best5"] = df["Best5_Percentage"].rank(ascending=False, method="min")

    int_cols = [c for c in df.columns if c.endswith("_Marks")] + [
        "Total_Marks_All",
        "Best5_Total_500",
        "Rank_Best5",
    ]
    for col in int_cols:
        df[col] = df[col].astype("Int64")

    analysis_df = build_subject_analysis(df, sorted_codes)
    return df, analysis_df, sorted_codes, metadata


def build_subject_analysis(df: pd.DataFrame, sorted_codes: List[str]) -> pd.DataFrame:
    """Build subject-wise analysis DataFrame matching the original Python schema."""
    sub_stats = []
    for code in sorted_codes:
        sub_name = CBSE_SUBJECT_CODES.get(code, f"Subject_{code}")
        col_m = f"{code}_{sub_name}_Marks"
        col_g = f"{code}_{sub_name}_Grade"
        s = df[col_m].dropna().astype(float)
        g = df.loc[s.index, col_g]
        if len(s) == 0:
            continue

        pass_count = int((g != "E").sum())
        quality_count = int(g.isin(["A1", "A2"]).sum())
        row = {
            "Subject_Code": code,
            "Subject_Name": sub_name.replace("_", " "),
            "Students_Appeared": int(len(s)),
            "Mean_Marks": round(float(s.mean()), 2),
            "Median_Marks": round(float(s.median()), 1),
            "Highest_Marks": int(s.max()),
            "Lowest_Marks": int(s.min()),
            "Pass_Count": pass_count,
            "Pass_Percentage": round((pass_count / len(s)) * 100, 2),
            "Quality_A1_A2_Pct": round((quality_count / len(s)) * 100, 2),
        }
        for gr in STANDARD_GRADES:
            row[f"Grade_{gr}"] = int((g == gr).sum())
        sub_stats.append(row)

    return pd.DataFrame(sub_stats)


def export_complete_csv_bytes(df: pd.DataFrame) -> bytes:
    """Return CSV bytes matching the exact column set of the original Python script."""
    drop_helper_cols = [c for c in ("Performance_Band", "Subject_Combo") if c in df.columns]
    return df.drop(columns=drop_helper_cols).to_csv(index=False).encode("utf-8")


def export_subject_csv_bytes(analysis_df: pd.DataFrame) -> bytes:
    """Return Subject Analysis CSV bytes matching the original Python script."""
    drop_helper_cols = [c for c in ("Quality_A1_A2_Pct",) if c in analysis_df.columns]
    return analysis_df.drop(columns=drop_helper_cols).to_csv(index=False).encode("utf-8")


def generate_printable_html(
    df: pd.DataFrame, analysis_df: pd.DataFrame, metadata: Dict[str, str]
) -> str:
    """Generate a clean printable HTML academic report for browser Print -> Save as PDF."""
    total_candidates = len(df)
    passed = df[(df["Result"] == "PASS") & df["Best5_Percentage"].notna()]
    pass_count = int((df["Result"] == "PASS").sum())
    pass_pct = round((pass_count / total_candidates) * 100, 2) if total_candidates else 0.0
    comp_count = int((df["Result"] == "COMP").sum())
    rl_count = int((df["Result"] == "R.L.").sum())

    mean_b5 = round(float(passed["Best5_Percentage"].mean()), 2) if len(passed) else 0.0
    med_b5 = round(float(passed["Best5_Percentage"].median()), 2) if len(passed) else 0.0
    max_b5 = round(float(passed["Best5_Percentage"].max()), 2) if len(passed) else 0.0
    min_b5 = round(float(passed["Best5_Percentage"].min()), 2) if len(passed) else 0.0
    dist_count = int((passed["Best5_Percentage"] >= 75).sum()) if len(passed) else 0
    dist_pct = round((dist_count / len(passed)) * 100, 2) if len(passed) else 0.0

    top5 = passed.sort_values(
        by=["Best5_Percentage", "Total_Marks_All"], ascending=[False, False]
    ).head(5)

    band_rows_html = ""
    for band in BAND_ORDER:
        cnt = int((passed["Performance_Band"] == band).sum())
        share = round((cnt / len(passed)) * 100, 1) if len(passed) else 0.0
        band_rows_html += f"<tr><td>{html.escape(band)}</td><td class='num'>{cnt}</td><td class='num'>{share}%</td></tr>"

    sub_rows_html = ""
    for _, r in analysis_df.iterrows():
        grade_tds = "".join(f"<td class='num'>{int(r[f'Grade_{g}'])}</td>" for g in STANDARD_GRADES)
        sub_rows_html += (
            f"<tr>"
            f"<td><b>{html.escape(str(r['Subject_Code']))}</b></td>"
            f"<td>{html.escape(str(r['Subject_Name']))}</td>"
            f"<td class='num'>{int(r['Students_Appeared'])}</td>"
            f"<td class='num'><b>{r['Mean_Marks']}</b></td>"
            f"<td class='num'>{r['Median_Marks']}</td>"
            f"<td class='num'>{int(r['Highest_Marks'])}</td>"
            f"<td class='num'>{int(r['Lowest_Marks'])}</td>"
            f"<td class='num'>{r['Pass_Percentage']}%</td>"
            f"{grade_tds}"
            f"</tr>"
        )

    top_rows_html = ""
    for _, r in top5.iterrows():
        top_rows_html += (
            f"<tr>"
            f"<td><b>#{int(r['Rank_Best5'])}</b></td>"
            f"<td>{html.escape(str(r['Roll_No']))}</td>"
            f"<td>{html.escape(str(r['Candidate_Name']))}</td>"
            f"<td class='num'>{r['Best5_Total_500']} / 500</td>"
            f"<td class='num'><b>{r['Best5_Percentage']}%</b></td>"
            f"<td class='num'>{r['Total_Marks_All']}</td>"
            f"</tr>"
        )

    grade_headers = "".join(f"<th class='num'>{g}</th>" for g in STANDARD_GRADES)
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Academic Performance Report — {html.escape(metadata['school_name'])}</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #0f172a; margin: 28px; }}
    .hdr {{ text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }}
    .hdr h1 {{ margin: 0; font-size: 18px; letter-spacing: 0.02em; }}
    .hdr p {{ margin: 4px 0 0; font-size: 12px; color: #475569; }}
    h2 {{ font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 22px; }}
    table {{ width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }}
    th, td {{ border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }}
    th {{ background: #f1f5f9; font-weight: 700; }}
    .num {{ text-align: right; font-variant-numeric: tabular-nums; }}
    @media print {{ body {{ margin: 10mm; }} }}
  </style>
</head>
<body>
  <div class="hdr">
    <h1>{html.escape(metadata['exam_title'])}</h1>
    <p><b>{html.escape(metadata['school_name'])}</b> (School Code: {html.escape(metadata['school_code'])})</p>
    <p>Region: {html.escape(metadata['region'])} &middot; Exam Date: {html.escape(metadata['exam_date'])} &middot; File: {html.escape(metadata['file_name'])}</p>
  </div>

  <h2>1. Executive Summary</h2>
  <table>
    <tr>
      <th>Total Candidates</th><td class="num"><b>{total_candidates}</b></td>
      <th>Passed</th><td class="num"><b>{pass_count} ({pass_pct}%)</b></td>
    </tr>
    <tr>
      <th>Compartment</th><td class="num">{comp_count}</td>
      <th>Result Later (R.L.)</th><td class="num">{rl_count}</td>
    </tr>
    <tr>
      <th>Mean Best-5 %</th><td class="num"><b>{mean_b5}%</b></td>
      <th>Median Best-5 %</th><td class="num">{med_b5}%</td>
    </tr>
    <tr>
      <th>Highest Best-5 %</th><td class="num"><b>{max_b5}%</b></td>
      <th>Lowest Best-5 %</th><td class="num">{min_b5}%</td>
    </tr>
    <tr>
      <th>Distinctions (&ge;75%)</th><td class="num"><b>{dist_count} ({dist_pct}%)</b></td>
      <th>90% &amp; Above</th><td class="num"><b>{int((passed['Best5_Percentage'] >= 90).sum()) if len(passed) else 0}</b></td>
    </tr>
  </table>

  <h2>2. Performance Bands (Best-5 %)</h2>
  <table>
    <thead><tr><th>Band</th><th class="num">Students</th><th class="num">Share of Passed</th></tr></thead>
    <tbody>{band_rows_html}</tbody>
  </table>

  <h2>3. Subject-Wise Analysis &amp; Grade Distribution</h2>
  <table>
    <thead>
      <tr>
        <th>Code</th><th>Subject</th><th class="num">App.</th><th class="num">Mean</th>
        <th class="num">Med.</th><th class="num">Max</th><th class="num">Min</th>
        <th class="num">Pass %</th>{grade_headers}
      </tr>
    </thead>
    <tbody>{sub_rows_html}</tbody>
  </table>

  <h2>4. Top 5 Performers (Best-5 Rankers)</h2>
  <table>
    <thead>
      <tr><th>Rank</th><th>Roll No</th><th>Candidate Name</th><th class="num">Best-5</th><th class="num">Best-5 %</th><th class="num">All Marks</th></tr>
    </thead>
    <tbody>{top_rows_html}</tbody>
  </table>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Sidebar: File Ingestion & Exports
# ---------------------------------------------------------------------------
with st.sidebar:
    st.markdown("### EXAM ANALYSIS")
    st.caption("CBSE Gazette Visual Report & Workbench")

    uploaded_file = st.file_uploader(
        "Upload CBSE Gazette (.TXT)",
        type=["txt"],
        help="Upload a School / Roll-No-wise CBSE Gazette plaintext .TXT file.",
    )

    if uploaded_file is not None:
        raw_text = uploaded_file.getvalue().decode("utf-8", errors="replace")
        active_filename = uploaded_file.name
        is_demo = False
    elif DEMO_FILE_PATH.exists():
        raw_text = DEMO_FILE_PATH.read_text(encoding="utf-8", errors="replace")
        active_filename = DEMO_FILE_PATH.name
        is_demo = True
    else:
        raw_text = ""
        active_filename = ""
        is_demo = False

    if not raw_text:
        st.warning("Upload a CBSE Gazette `.TXT` file above to begin analysis.")
        st.stop()

    df, analysis_df, sorted_codes, metadata = parse_cbse_gazette_text(raw_text, active_filename)

    if df.empty:
        st.error(
            "No valid CBSE candidate roll-number records were found in this file. "
            "Please upload an official CBSE Gazette `.TXT` file."
        )
        st.stop()

    st.divider()
    st.markdown("#### Active File")
    st.code(active_filename, language=None)
    if is_demo:
        st.caption("Loaded synthetic demo gazette. Upload your own `.TXT` file above to analyze real results.")

    st.divider()
    st.markdown("#### Exports & Print Report")
    base_stem = active_filename.rsplit(".", 1)[0]

    st.download_button(
        label="Download Complete Result CSV",
        data=export_complete_csv_bytes(df),
        file_name=f"{base_stem}_complete_result.csv",
        mime="text/csv",
        use_container_width=True,
    )
    st.download_button(
        label="Download Subject Analysis CSV",
        data=export_subject_csv_bytes(analysis_df),
        file_name=f"{base_stem}_subject_analysis.csv",
        mime="text/csv",
        use_container_width=True,
    )
    st.download_button(
        label="Download Printable Report (HTML/PDF)",
        data=generate_printable_html(df, analysis_df, metadata).encode("utf-8"),
        file_name=f"{base_stem}_academic_report.html",
        mime="text/html",
        use_container_width=True,
        help="Open in your browser and press Ctrl+P / Cmd+P to save as a formatted PDF.",
    )


# ---------------------------------------------------------------------------
# Header Metadata Banner
# ---------------------------------------------------------------------------
st.markdown(
    f"""
    <div class="report-banner">
      <div class="report-kicker">{html.escape(metadata['exam_title'])}</div>
      <div class="report-title">{html.escape(metadata['school_name'])}</div>
      <div class="report-meta">
        School Code: {html.escape(metadata['school_code'])} &middot;
        Region: {html.escape(metadata['region'])} &middot;
        Exam Date: {html.escape(metadata['exam_date'])} &middot;
        Total Candidates: {len(df)}
      </div>
    </div>
    """,
    unsafe_allow_html=True,
)


# ---------------------------------------------------------------------------
# Computed Summary Metrics
# ---------------------------------------------------------------------------
total_candidates = len(df)
passed_df = df[(df["Result"] == "PASS") & df["Best5_Percentage"].notna()]
pass_count = int((df["Result"] == "PASS").sum())
pass_pct = round((pass_count / total_candidates) * 100, 2) if total_candidates else 0.0
comp_count = int((df["Result"] == "COMP").sum())
rl_count = int((df["Result"] == "R.L.").sum())

mean_b5 = round(float(passed_df["Best5_Percentage"].mean()), 2) if len(passed_df) else 0.0
median_b5 = round(float(passed_df["Best5_Percentage"].median()), 2) if len(passed_df) else 0.0
highest_b5 = round(float(passed_df["Best5_Percentage"].max()), 2) if len(passed_df) else 0.0
lowest_b5 = round(float(passed_df["Best5_Percentage"].min()), 2) if len(passed_df) else 0.0

distinction_count = int((passed_df["Best5_Percentage"] >= 75).sum()) if len(passed_df) else 0
distinction_pct = round((distinction_count / len(passed_df)) * 100, 2) if len(passed_df) else 0.0
ninety_plus_count = int((passed_df["Best5_Percentage"] >= 90).sum()) if len(passed_df) else 0


# ---------------------------------------------------------------------------
# Main Navigation Tabs
# ---------------------------------------------------------------------------
tab_overview, tab_subjects, tab_custom, tab_students = st.tabs(
    [
        "Executive Overview",
        "Subject Breakdown",
        "Custom Analysis & Pivot Builder",
        "Student Register & Scorecard",
    ]
)

# ===========================================================================
# TAB 1: EXECUTIVE OVERVIEW
# ===========================================================================
with tab_overview:
    k1, k2, k3, k4 = st.columns(4)
    k1.metric(
        "Pass Rate",
        f"{pass_pct}%",
        f"{pass_count}/{total_candidates} passed · {comp_count} COMP · {rl_count} R.L.",
        delta_color="off",
    )
    k2.metric(
        "Mean Best-5 Score",
        f"{mean_b5}%",
        f"Median: {median_b5}%",
        delta_color="off",
    )
    k3.metric(
        "School Top Mark",
        f"{highest_b5}%",
        f"Lowest Passed: {lowest_b5}%",
        delta_color="off",
    )
    k4.metric(
        "Distinctions (≥75%)",
        f"{distinction_count}",
        f"{distinction_pct}% of passed · {ninety_plus_count} at 90%+",
        delta_color="off",
    )

    st.write("")
    c_left, c_right = st.columns(2)

    with c_left:
        st.subheader("Performance Bands (Best-5 %)")
        band_counts = [
            {
                "Band": band,
                "Students": int((passed_df["Performance_Band"] == band).sum()),
            }
            for band in BAND_ORDER
        ]
        band_df = pd.DataFrame(band_counts)
        band_df["Share"] = (
            (band_df["Students"] / len(passed_df) * 100).round(1) if len(passed_df) else 0.0
        )
        fig_band = px.bar(
            band_df,
            x="Students",
            y="Band",
            orientation="h",
            text=band_df.apply(lambda r: f"{r['Students']} ({r['Share']}%)", axis=1),
            color="Band",
            color_discrete_map=BAND_COLORS,
            category_orders={"Band": BAND_ORDER},
        )
        fig_band.update_layout(
            showlegend=False,
            height=320,
            margin=dict(l=10, r=20, t=10, b=10),
            plot_bgcolor="#FFFFFF",
            paper_bgcolor="#FFFFFF",
            xaxis_title="Passed Candidates",
            yaxis_title=None,
        )
        fig_band.update_traces(textposition="outside", cliponaxis=False)
        st.plotly_chart(fig_band, use_container_width=True)

    with c_right:
        st.subheader("Overall CBSE Grade Distribution (A1–E)")
        grade_totals = []
        for gr in STANDARD_GRADES:
            col = f"Grade_{gr}"
            cnt = int(analysis_df[col].sum()) if col in analysis_df.columns else 0
            grade_totals.append({"Grade": gr, "Count": cnt})
        grade_df = pd.DataFrame(grade_totals)
        fig_grade = px.bar(
            grade_df,
            x="Grade",
            y="Count",
            text="Count",
            color="Grade",
            color_discrete_map=GRADE_COLORS,
            category_orders={"Grade": STANDARD_GRADES},
        )
        fig_grade.update_layout(
            showlegend=False,
            height=320,
            margin=dict(l=10, r=10, t=10, b=10),
            plot_bgcolor="#FFFFFF",
            paper_bgcolor="#FFFFFF",
            xaxis_title="CBSE Grade",
            yaxis_title="Grades Awarded",
        )
        fig_grade.update_traces(textposition="outside", cliponaxis=False)
        st.plotly_chart(fig_grade, use_container_width=True)

    # Automated Academic Audit & Observations
    st.subheader("Automated Academic Audit & Observations")
    insights = [
        (
            "positive" if pass_pct >= 95 else ("warning" if pass_pct < 85 else "neutral"),
            "Institutional Pass Rate",
            f"{pass_count} of {total_candidates} candidates ({pass_pct}%) cleared the examination. "
            f"Compartment: {comp_count} · Result Later (R.L.): {rl_count}.",
        ),
        (
            "highlight",
            "Distinction Achievement (≥75% Best-5)",
            f"{distinction_count} students ({distinction_pct}% of passed cohort) achieved Distinction, "
            f"including {ninety_plus_count} student(s) scoring 90% and above.",
        ),
    ]
    if not analysis_df.empty:
        by_mean = analysis_df.sort_values("Mean_Marks", ascending=False)
        top_sub = by_mean.iloc[0]
        low_sub = by_mean.iloc[-1]
        insights.append(
            (
                "positive",
                f"Highest Average: {top_sub['Subject_Name']} ({top_sub['Subject_Code']})",
                f"Delivered the cohort's strongest mean of {top_sub['Mean_Marks']} across "
                f"{int(top_sub['Students_Appeared'])} students (Peak: {int(top_sub['Highest_Marks'])}, "
                f"A1+A2 Share: {top_sub['Quality_A1_A2_Pct']}%).",
            )
        )
        if len(by_mean) > 1:
            insights.append(
                (
                    "neutral",
                    f"Curriculum Attention: {low_sub['Subject_Name']} ({low_sub['Subject_Code']})",
                    f"Recorded the lowest subject mean of {low_sub['Mean_Marks']} with "
                    f"{low_sub['Pass_Percentage']}% pass rate (Range: {int(low_sub['Lowest_Marks'])}–{int(low_sub['Highest_Marks'])}).",
                )
            )

    ins_cols = st.columns(2)
    for idx, (kind, title, desc) in enumerate(insights):
        css_cls = {
            "positive": "insight-card insight-positive",
            "highlight": "insight-card insight-highlight",
            "warning": "insight-card insight-warning",
        }.get(kind, "insight-card")
        with ins_cols[idx % 2]:
            st.markdown(
                f"""
                <div class="{css_cls}" style="margin-bottom: 0.75rem;">
                  <div class="insight-title">{html.escape(title)}</div>
                  <div class="insight-body">{html.escape(desc)}</div>
                </div>
                """,
                unsafe_allow_html=True,
            )

    # Top 5 Performers
    st.subheader("Top 5 Performers (Best-5 Rankers)")
    top5_df = (
        passed_df.sort_values(
            by=["Best5_Percentage", "Total_Marks_All"], ascending=[False, False]
        )
        .head(5)[
            [
                "Rank_Best5",
                "Roll_No",
                "Candidate_Name",
                "Gender",
                "Best5_Total_500",
                "Best5_Percentage",
                "Total_Marks_All",
                "Percentage_All",
                "Result",
            ]
        ]
        .reset_index(drop=True)
    )
    st.dataframe(top5_df, use_container_width=True, hide_index=True)


# ===========================================================================
# TAB 2: SUBJECT BREAKDOWN
# ===========================================================================
with tab_subjects:
    st.subheader("Curriculum & Subject Performance Breakdown")
    chart_mode = st.radio(
        "Visualization Mode",
        ["Mean Marks vs School Benchmark", "100% Stacked Grade Distribution (A1–E)"],
        horizontal=True,
        label_visibility="collapsed",
    )

    if chart_mode == "Mean Marks vs School Benchmark":
        sub_plot_df = analysis_df.sort_values("Mean_Marks", ascending=True).copy()
        sub_plot_df["Label"] = sub_plot_df["Subject_Code"] + " — " + sub_plot_df["Subject_Name"]
        sub_plot_df["Status"] = np.where(
            sub_plot_df["Mean_Marks"] >= mean_b5, "Above School Mean", "Below School Mean"
        )
        fig_sub = px.bar(
            sub_plot_df,
            x="Mean_Marks",
            y="Label",
            orientation="h",
            color="Status",
            color_discrete_map={
                "Above School Mean": "#059669",
                "Below School Mean": "#2563EB",
            },
            text="Mean_Marks",
            hover_data=["Students_Appeared", "Median_Marks", "Highest_Marks", "Lowest_Marks", "Pass_Percentage"],
        )
        fig_sub.add_vline(
            x=mean_b5,
            line_dash="dash",
            line_color="#1E3A8A",
            annotation_text=f"School Mean ({mean_b5}%)",
            annotation_position="top right",
        )
        fig_sub.update_layout(
            height=max(340, len(sub_plot_df) * 44),
            margin=dict(l=10, r=30, t=30, b=10),
            plot_bgcolor="#FFFFFF",
            paper_bgcolor="#FFFFFF",
            xaxis=dict(range=[0, 105], title="Mean Marks (/100)"),
            yaxis_title=None,
            legend_title=None,
        )
        fig_sub.update_traces(textposition="outside")
        st.plotly_chart(fig_sub, use_container_width=True)
    else:
        fig_stack = go.Figure()
        labels = analysis_df["Subject_Code"] + " — " + analysis_df["Subject_Name"]
        for gr in STANDARD_GRADES:
            counts = analysis_df[f"Grade_{gr}"]
            pcts = (counts / analysis_df["Students_Appeared"] * 100).round(1)
            fig_stack.add_trace(
                go.Bar(
                    name=gr,
                    y=labels,
                    x=pcts,
                    orientation="h",
                    marker_color=GRADE_COLORS[gr],
                    customdata=counts,
                    hovertemplate=f"<b>%{{y}}</b><br>Grade {gr}: %{{customdata}} students (%{{x}}%)<extra></extra>",
                )
            )
        fig_stack.update_layout(
            barmode="stack",
            height=max(360, len(analysis_df) * 44),
            margin=dict(l=10, r=20, t=20, b=10),
            plot_bgcolor="#FFFFFF",
            paper_bgcolor="#FFFFFF",
            xaxis=dict(range=[0, 100], title="Grade Distribution (%)"),
            yaxis_title=None,
            legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0),
        )
        st.plotly_chart(fig_stack, use_container_width=True)

    st.subheader("Subject Statistical Summary Table")
    st.dataframe(analysis_df, use_container_width=True, hide_index=True)


# ===========================================================================
# TAB 3: CUSTOM ANALYSIS & PIVOT BUILDER (NO-AI INTERACTIVE WORKBENCH)
# ===========================================================================
with tab_custom:
    st.subheader("Interactive Filter & Pivot Builder")
    st.caption(
        "Ask custom questions about this gazette file using presets, multi-criteria cohort filters, "
        "and a live Row × Column cross-tabulation builder."
    )

    # Preset buttons via session state
    if "preset_result" not in st.session_state:
        st.session_state.preset_result = "ALL"
        st.session_state.preset_min_b5 = 0.0
        st.session_state.preset_max_b5 = 100.0
        st.session_state.preset_row = "Subject"
        st.session_state.preset_col = "Grade (A1–E)"
        st.session_state.preset_metric = "Candidate Count (N)"

    p1, p2, p3, p4, p5, p6 = st.columns(6)
    if p1.button("Distinction (≥75%)", use_container_width=True):
        st.session_state.preset_result = "PASS"
        st.session_state.preset_min_b5 = 75.0
        st.session_state.preset_max_b5 = 100.0
        st.session_state.preset_row = "Performance Band"
        st.session_state.preset_col = "Gender"
        st.session_state.preset_metric = "Candidate Count (N)"
    if p2.button("Borderline (<55%)", use_container_width=True):
        st.session_state.preset_result = "ALL"
        st.session_state.preset_min_b5 = 0.0
        st.session_state.preset_max_b5 = 55.0
        st.session_state.preset_row = "Subject"
        st.session_state.preset_col = "Grade (A1–E)"
        st.session_state.preset_metric = "Candidate Count (N)"
    if p3.button("Subject × Grade", use_container_width=True):
        st.session_state.preset_result = "ALL"
        st.session_state.preset_min_b5 = 0.0
        st.session_state.preset_max_b5 = 100.0
        st.session_state.preset_row = "Subject"
        st.session_state.preset_col = "Grade (A1–E)"
        st.session_state.preset_metric = "Candidate Count (N)"
    if p4.button("Gender × Band", use_container_width=True):
        st.session_state.preset_result = "ALL"
        st.session_state.preset_min_b5 = 0.0
        st.session_state.preset_max_b5 = 100.0
        st.session_state.preset_row = "Gender"
        st.session_state.preset_col = "Performance Band"
        st.session_state.preset_metric = "Candidate Count (N)"
    if p5.button("COMP / R.L. Audit", use_container_width=True):
        st.session_state.preset_result = "NON_PASS"
        st.session_state.preset_min_b5 = 0.0
        st.session_state.preset_max_b5 = 100.0
        st.session_state.preset_row = "Result Status"
        st.session_state.preset_col = "Gender"
        st.session_state.preset_metric = "Candidate Count (N)"
    if p6.button("Reset Filters", use_container_width=True):
        st.session_state.preset_result = "ALL"
        st.session_state.preset_min_b5 = 0.0
        st.session_state.preset_max_b5 = 100.0
        st.session_state.preset_row = "Subject"
        st.session_state.preset_col = "Grade (A1–E)"
        st.session_state.preset_metric = "Candidate Count (N)"

    # Filter Controls
    with st.expander("Cohort Filter Controls", expanded=True):
        fc1, fc2, fc3, fc4 = st.columns(4)
        q_search = fc1.text_input("Search Name or Roll No", placeholder="e.g. 90000001 or AAA")

        result_options = ["ALL", "NON_PASS"] + sorted(df["Result"].dropna().unique().tolist())
        default_res_idx = (
            result_options.index(st.session_state.preset_result)
            if st.session_state.preset_result in result_options
            else 0
        )
        f_result = fc2.selectbox("Result Status", result_options, index=default_res_idx)
        f_gender = fc3.selectbox("Gender", ["ALL", "M", "F"])
        f_band = fc4.selectbox("Performance Band", ["ALL"] + BAND_ORDER + ["Pending / R.L."])

        fc5, fc6, fc7, fc8 = st.columns(4)
        sub_options = ["ALL"] + [f"{c} — {subject_display_name(c)}" for c in sorted_codes]
        f_sub_label = fc5.selectbox("Enrolled Subject", sub_options)
        f_sub_code = f_sub_label.split(" — ")[0] if f_sub_label != "ALL" else "ALL"
        f_grade = fc6.selectbox("Grade Earned", ["ALL"] + STANDARD_GRADES)
        f_b5_range = fc7.slider(
            "Best-5 % Range",
            0.0,
            100.0,
            (float(st.session_state.preset_min_b5), float(st.session_state.preset_max_b5)),
            step=1.0,
        )
        f_sub_marks = fc8.slider("Subject Marks Range", 0, 100, (0, 100), step=1)

    # Apply filters
    mask = pd.Series(True, index=df.index)
    if q_search.strip():
        q = q_search.strip().lower()
        mask &= (
            df["Roll_No"].astype(str).str.lower().str.contains(q, na=False)
            | df["Candidate_Name"].astype(str).str.lower().str.contains(q, na=False)
        )
    if f_result == "NON_PASS":
        mask &= df["Result"] != "PASS"
    elif f_result != "ALL":
        mask &= df["Result"] == f_result

    if f_gender != "ALL":
        mask &= df["Gender"] == f_gender
    if f_band != "ALL":
        mask &= df["Performance_Band"] == f_band

    if f_b5_range != (0.0, 100.0):
        mask &= df["Best5_Percentage"].between(f_b5_range[0], f_b5_range[1], inclusive="both")

    if f_sub_code != "ALL":
        sub_prefix = f"{f_sub_code}_{CBSE_SUBJECT_CODES.get(f_sub_code, f'Subject_{f_sub_code}')}"
        m_col = f"{sub_prefix}_Marks"
        g_col = f"{sub_prefix}_Grade"
        # Enrolled means either marks exist or grade is non-empty
        mask &= df[m_col].notna() | (df[g_col] != "")
        if f_grade != "ALL":
            mask &= df[g_col] == f_grade
        if f_sub_marks != (0, 100):
            mask &= df[m_col].astype(float).between(f_sub_marks[0], f_sub_marks[1], inclusive="both")
    elif f_grade != "ALL":
        grade_cols = [c for c in df.columns if c.endswith("_Grade")]
        mask &= df[grade_cols].eq(f_grade).any(axis=1)

    filtered_df = df[mask].copy()

    # Cohort summary bar
    cs1, cs2, cs3, cs4 = st.columns(4)
    f_passed = filtered_df[(filtered_df["Result"] == "PASS") & filtered_df["Best5_Percentage"].notna()]
    f_pass_rate = round((int((filtered_df["Result"] == "PASS").sum()) / len(filtered_df)) * 100, 1) if len(filtered_df) else 0.0
    f_mean = round(float(f_passed["Best5_Percentage"].mean()), 2) if len(f_passed) else 0.0
    f_med = round(float(f_passed["Best5_Percentage"].median()), 2) if len(f_passed) else 0.0
    cs1.metric("Matching Students", f"{len(filtered_df)} / {total_candidates}")
    cs2.metric("Cohort Pass Rate", f"{f_pass_rate}%")
    cs3.metric("Cohort Mean Best-5", f"{f_mean}%")
    cs4.metric("Cohort Median Best-5", f"{f_med}%")

    st.divider()

    # Pivot Matrix Builder
    st.markdown("#### Live Cross-Tabulation & Pivot Matrix")
    row_opts = [
        "Subject",
        "Performance Band",
        "Gender",
        "Result Status",
        "Internal Grade (GR1)",
        "Subject Combination",
    ]
    col_opts = ["None", "Grade (A1–E)", "Performance Band", "Gender", "Result Status"]
    metric_opts = [
        "Candidate Count (N)",
        "Mean Score / %",
        "Median Score / %",
        "Highest Score / %",
        "Lowest Score / %",
        "Pass Rate %",
    ]

    pc1, pc2, pc3 = st.columns(3)
    row_dim = pc1.selectbox(
        "Row Dimension",
        row_opts,
        index=row_opts.index(st.session_state.preset_row) if st.session_state.preset_row in row_opts else 0,
    )
    col_dim = pc2.selectbox(
        "Column Breakdown",
        col_opts,
        index=col_opts.index(st.session_state.preset_col) if st.session_state.preset_col in col_opts else 0,
    )
    metric_choice = pc3.selectbox(
        "Aggregate Metric",
        metric_opts,
        index=metric_opts.index(st.session_state.preset_metric) if st.session_state.preset_metric in metric_opts else 0,
    )

    def build_pivot_dataframe(
        source_df: pd.DataFrame, r_dim: str, c_dim: str, met: str
    ) -> pd.DataFrame:
        if source_df.empty:
            return pd.DataFrame()

        # Subject-level long frame when row is Subject
        if r_dim == "Subject":
            long_rows = []
            for code in sorted_codes:
                sub_name = CBSE_SUBJECT_CODES.get(code, f"Subject_{code}")
                m_col = f"{code}_{sub_name}_Marks"
                g_col = f"{code}_{sub_name}_Grade"
                sub_slice = source_df[source_df[m_col].notna() | (source_df[g_col] != "")]
                for _, r in sub_slice.iterrows():
                    long_rows.append(
                        {
                            "RowKey": f"{code} — {sub_name.replace('_', ' ')}",
                            "Grade (A1–E)": r[g_col] if r[g_col] in STANDARD_GRADES else "Other",
                            "Performance Band": r["Performance_Band"],
                            "Gender": "Male (M)" if r["Gender"] == "M" else "Female (F)",
                            "Result Status": r["Result"],
                            "Score": float(r[m_col]) if pd.notna(r[m_col]) else np.nan,
                            "IsPass": 1.0 if r[g_col] != "E" and r["Result"] == "PASS" else 0.0,
                        }
                    )
            work = pd.DataFrame(long_rows)
        else:
            dim_map = {
                "Performance Band": "Performance_Band",
                "Gender": "Gender",
                "Result Status": "Result",
                "Internal Grade (GR1)": "Internal_Grade_1",
                "Subject Combination": "Subject_Combo",
            }
            src_col = dim_map[r_dim]
            work = pd.DataFrame(
                {
                    "RowKey": source_df[src_col].replace("", "None").fillna("None"),
                    "Performance Band": source_df["Performance_Band"],
                    "Gender": source_df["Gender"].map({"M": "Male (M)", "F": "Female (F)"}).fillna(source_df["Gender"]),
                    "Result Status": source_df["Result"],
                    "Score": source_df["Best5_Percentage"].astype(float),
                    "IsPass": (source_df["Result"] == "PASS").astype(float),
                }
            )
            if c_dim == "Grade (A1–E)":
                # Explode across earned grades for candidate-level rows
                exploded = []
                grade_cols = [c for c in source_df.columns if c.endswith("_Grade")]
                for idx_r, r in source_df.iterrows():
                    for gc in grade_cols:
                        gv = r[gc]
                        if gv in STANDARD_GRADES:
                            exploded.append(
                                {
                                    "RowKey": work.loc[idx_r, "RowKey"],
                                    "Grade (A1–E)": gv,
                                    "Score": work.loc[idx_r, "Score"],
                                    "IsPass": work.loc[idx_r, "IsPass"],
                                }
                            )
                work = pd.DataFrame(exploded)

        if work.empty:
            return pd.DataFrame()

        if met == "Candidate Count (N)":
            val_col, agg_fn = "RowKey", "count"
        elif met == "Mean Score / %":
            val_col, agg_fn = "Score", "mean"
        elif met == "Median Score / %":
            val_col, agg_fn = "Score", "median"
        elif met == "Highest Score / %":
            val_col, agg_fn = "Score", "max"
        elif met == "Lowest Score / %":
            val_col, agg_fn = "Score", "min"
        else:
            val_col, agg_fn = "IsPass", lambda s: round(float(s.mean()) * 100, 1) if len(s) else np.nan

        if c_dim == "None":
            piv = work.groupby("RowKey", dropna=False)[val_col].agg(agg_fn).to_frame(name=met)
        else:
            piv = pd.pivot_table(
                work,
                index="RowKey",
                columns=c_dim,
                values=val_col,
                aggfunc=agg_fn,
            )
            if c_dim == "Grade (A1–E)":
                ordered_cols = [g for g in STANDARD_GRADES if g in piv.columns]
                other_cols = [c for c in piv.columns if c not in ordered_cols]
                piv = piv[ordered_cols + other_cols]
            elif c_dim == "Performance Band":
                ordered_cols = [b for b in BAND_ORDER if b in piv.columns]
                other_cols = [c for c in piv.columns if c not in ordered_cols]
                piv = piv[ordered_cols + other_cols]

        if met == "Candidate Count (N)":
            piv = piv.fillna(0).astype(int)
        else:
            piv = piv.round(2)

        piv.index.name = r_dim
        return piv

    pivot_df = build_pivot_dataframe(filtered_df, row_dim, col_dim, metric_choice)

    if pivot_df.empty:
        st.info("No data available for the current filter and pivot selection.")
    else:
        st.dataframe(pivot_df, use_container_width=True)

        # Synchronized Plotly chart for pivot output
        plot_reset = pivot_df.reset_index()
        if col_dim == "None":
            fig_piv = px.bar(
                plot_reset,
                x=row_dim,
                y=metric_choice,
                text=metric_choice,
                color_discrete_sequence=["#1D4ED8"],
            )
        else:
            melted = plot_reset.melt(id_vars=row_dim, var_name=col_dim, value_name=metric_choice)
            color_map = GRADE_COLORS if col_dim == "Grade (A1–E)" else (
                BAND_COLORS if col_dim == "Performance Band" else None
            )
            fig_piv = px.bar(
                melted,
                x=row_dim,
                y=metric_choice,
                color=col_dim,
                barmode="stack" if metric_choice == "Candidate Count (N)" else "group",
                color_discrete_map=color_map,
            )
        fig_piv.update_layout(
            height=340,
            margin=dict(l=10, r=10, t=20, b=10),
            plot_bgcolor="#FFFFFF",
            paper_bgcolor="#FFFFFF",
        )
        st.plotly_chart(fig_piv, use_container_width=True)

        dl1, dl2 = st.columns(2)
        dl1.download_button(
            "Download Pivot Matrix CSV",
            data=pivot_df.to_csv().encode("utf-8"),
            file_name=f"{base_stem}_pivot_analysis.csv",
            mime="text/csv",
            use_container_width=True,
        )
        dl2.download_button(
            "Download Filtered Cohort CSV",
            data=export_complete_csv_bytes(filtered_df),
            file_name=f"{base_stem}_filtered_cohort.csv",
            mime="text/csv",
            use_container_width=True,
        )


# ===========================================================================
# TAB 4: STUDENT REGISTER & INDIVIDUAL SCORECARD
# ===========================================================================
with tab_students:
    st.subheader("Individual Student Scorecard")
    student_labels = [
        f"{r['Roll_No']} — {r['Candidate_Name']} ({r['Result']})"
        for _, r in df.iterrows()
    ]
    selected_label = st.selectbox(
        "Select a candidate to inspect their full scorecard and comparison against school averages",
        student_labels,
    )
    selected_roll = selected_label.split(" — ")[0]
    student_row = df[df["Roll_No"] == selected_roll].iloc[0]

    sc1, sc2, sc3, sc4 = st.columns(4)
    rank_disp = f"#{int(student_row['Rank_Best5'])}" if pd.notna(student_row["Rank_Best5"]) else "—"
    b5_pct_disp = f"{student_row['Best5_Percentage']}%" if pd.notna(student_row["Best5_Percentage"]) else "—"
    b5_tot_disp = f"{int(student_row['Best5_Total_500'])} / 500" if pd.notna(student_row["Best5_Total_500"]) else "—"
    all_tot_disp = f"{int(student_row['Total_Marks_All'])}" if pd.notna(student_row["Total_Marks_All"]) else "—"

    sc1.metric("School Rank (Best-5)", rank_disp, f"Result: {student_row['Result']}", delta_color="off")
    sc2.metric("Best-5 Percentage", b5_pct_disp, student_row["Performance_Band"], delta_color="off")
    sc3.metric("Best-5 Total", b5_tot_disp, f"Gender: {student_row['Gender']}", delta_color="off")
    sc4.metric(
        "All Subjects Total",
        all_tot_disp,
        f"Internal: {student_row['Internal_Grade_1']} {student_row['Internal_Grade_2']} {student_row['Internal_Grade_3']}".strip() or "Internal: —",
        delta_color="off",
    )

    # Subject-by-subject comparison vs school mean
    sub_mean_map = dict(zip(analysis_df["Subject_Code"], analysis_df["Mean_Marks"]))
    card_rows = []
    for code in sorted_codes:
        sub_name = CBSE_SUBJECT_CODES.get(code, f"Subject_{code}")
        m_col = f"{code}_{sub_name}_Marks"
        g_col = f"{code}_{sub_name}_Grade"
        mk = student_row[m_col]
        gr = student_row[g_col]
        if pd.notna(mk) or gr:
            school_avg = sub_mean_map.get(code, np.nan)
            delta = round(float(mk) - float(school_avg), 1) if pd.notna(mk) and pd.notna(school_avg) else np.nan
            card_rows.append(
                {
                    "Code": code,
                    "Subject": sub_name.replace("_", " "),
                    "Marks": int(mk) if pd.notna(mk) else None,
                    "Grade": gr or "—",
                    "School Mean": school_avg,
                    "Delta vs Mean": delta,
                }
            )
    card_df = pd.DataFrame(card_rows)

    col_card_tbl, col_card_chart = st.columns([1.15, 1])
    with col_card_tbl:
        st.dataframe(card_df, use_container_width=True, hide_index=True)
    with col_card_chart:
        scored_card = card_df.dropna(subset=["Marks"])
        if not scored_card.empty:
            fig_sc = go.Figure()
            fig_sc.add_trace(
                go.Bar(
                    name="Student Marks",
                    x=scored_card["Subject"],
                    y=scored_card["Marks"],
                    marker_color="#1D4ED8",
                )
            )
            fig_sc.add_trace(
                go.Scatter(
                    name="School Mean",
                    x=scored_card["Subject"],
                    y=scored_card["School Mean"],
                    mode="markers+lines",
                    marker=dict(color="#059669", size=9),
                    line=dict(color="#059669", dash="dot"),
                )
            )
            fig_sc.update_layout(
                height=290,
                margin=dict(l=10, r=10, t=20, b=10),
                plot_bgcolor="#FFFFFF",
                paper_bgcolor="#FFFFFF",
                yaxis=dict(range=[0, 105], title="Marks (/100)"),
                legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="left", x=0),
            )
            st.plotly_chart(fig_sc, use_container_width=True)
        else:
            st.info("No numeric marks recorded for this candidate (e.g., Result Later).")

    st.divider()
    st.subheader("Complete Student Register")
    reg_search = st.text_input("Filter Register by Name or Roll No", key="reg_search")
    reg_df = df.copy()
    if reg_search.strip():
        q = reg_search.strip().lower()
        reg_df = reg_df[
            reg_df["Roll_No"].astype(str).str.lower().str.contains(q, na=False)
            | reg_df["Candidate_Name"].astype(str).str.lower().str.contains(q, na=False)
        ]

    display_cols = [
        "Rank_Best5",
        "Roll_No",
        "Candidate_Name",
        "Gender",
        "Result",
        "Best5_Percentage",
        "Best5_Total_500",
        "Total_Marks_All",
        "Performance_Band",
    ] + [f"{c}_{CBSE_SUBJECT_CODES.get(c, f'Subject_{c}')}_Marks" for c in sorted_codes]
    st.dataframe(reg_df[display_cols], use_container_width=True, hide_index=True)
