import re
import time
import pandas as pd
import numpy as np
from google.colab import files
from IPython.display import display

# CBSE Class 12 Subject Codes (auto-falls back to "Subject_<code>" if unlisted)
CBSE_SUBJECT_CODES = {
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


def parse_cbse_gazette(filepath: str):
    """Parse a CBSE School/Roll-No-wise Gazette .TXT file into a complete DataFrame."""
    with open(filepath, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()
    lines = text.splitlines()

    # Extract school & exam metadata from header
    date_m = re.search(r"DATE:-\s*(\S+)", text)
    region_m = re.search(r"REGION:\s*([A-Z0-9\-]+)", text)
    school_m = re.search(r"SCHOOL\s*:\s*-\s*(\d+)\s+(.+)", text)

    exam_date = date_m.group(1).strip() if date_m else ""
    region = region_m.group(1).strip() if region_m else ""
    school_code = school_m.group(1).strip() if school_m else ""
    school_name = school_m.group(2).strip() if school_m else ""

    raw_records = []
    all_subject_codes = set()
    i = 0

    while i < len(lines):
        line = lines[i].rstrip()
        match = re.match(r"^(\d{8})\s+([A-Z]?)\s+([MF])\s+([A-Z.\s]+?)\s+(\d{3}\s+.*)$", line)
        if match:
            roll_no = match.group(1)
            gender = match.group(3)
            name = re.sub(r"\s+", " ", match.group(4).strip())
            rest_tokens = match.group(5).strip().split()

            sub_codes = []
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
            mks_pairs = re.findall(r"(\d{3}|AB|ABS)(?:\s+([A-E]\d))?", marks_line)

            sub_dict = {}
            if len(mks_pairs) == len(sub_codes):
                for code, (mk, gr) in zip(sub_codes, mks_pairs):
                    mk_val = int(mk) if mk.isdigit() else np.nan
                    sub_dict[code] = (mk_val, gr or ("AB" if not mk.isdigit() else ""))

            raw_records.append({
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
            })
            i += 2
        else:
            i += 1

    sorted_codes = sorted(
        all_subject_codes,
        key=lambda c: (0 if c in ("301", "302", "001", "002") else 1, c),
    )

    rows = []
    for rec in raw_records:
        row = {k: v for k, v in rec.items() if k != "Subjects"}
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

        rows.append(row)

    df = pd.DataFrame(rows)
    df["Rank_Best5"] = df["Best5_Percentage"].rank(ascending=False, method="min")

    int_cols = [c for c in df.columns if c.endswith("_Marks")] + [
        "Total_Marks_All", "Best5_Total_500", "Rank_Best5"
    ]
    for col in int_cols:
        df[col] = df[col].astype("Int64")

    return df, sorted_codes


def build_subject_analysis(df: pd.DataFrame, sorted_codes: list) -> pd.DataFrame:
    """Build a subject-wise analysis DataFrame from declared results."""
    grades_order = ["A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2", "E"]
    sub_stats = []

    for code in sorted_codes:
        sub_name = CBSE_SUBJECT_CODES.get(code, f"Subject_{code}")
        col_m = f"{code}_{sub_name}_Marks"
        col_g = f"{code}_{sub_name}_Grade"
        s = df[col_m].dropna()
        g = df.loc[s.index, col_g]
        if len(s) == 0:
            continue

        row = {
            "Subject_Code": code,
            "Subject_Name": sub_name.replace("_", " "),
            "Students_Appeared": len(s),
            "Mean_Marks": round(s.mean(), 2),
            "Median_Marks": round(s.median(), 1),
            "Highest_Marks": int(s.max()),
            "Lowest_Marks": int(s.min()),
            "Pass_Count": int((g != "E").sum()),
            "Pass_Percentage": round(((g != "E").sum() / len(s)) * 100, 2),
        }
        for gr in grades_order:
            row[f"Grade_{gr}"] = int((g == gr).sum())
        sub_stats.append(row)

    return pd.DataFrame(sub_stats)


def print_summary(df: pd.DataFrame, analysis_df: pd.DataFrame) -> None:
    passed = df[df["Result"] == "PASS"]
    print("\n================ OVERALL SUMMARY ================")
    print(f"Total Candidates : {len(df)}")
    print("Result Breakdown :", df["Result"].value_counts().to_dict())
    if len(passed) > 0:
        print(f"Mean Best-5 %    : {passed['Best5_Percentage'].mean():.2f}%")
        print(f"Median Best-5 %  : {passed['Best5_Percentage'].median():.2f}%")
        print(f"Highest Best-5 % : {passed['Best5_Percentage'].max():.2f}%")
        print(f"Lowest Best-5 %  : {passed['Best5_Percentage'].min():.2f}%")

    print("\n=========== PERFORMANCE BANDS (Best-5 %) ===========")
    bins = [0, 50, 60, 75, 90, 100.1]
    labels = ["Below 50%", "50% - 59.9%", "60% - 74.9%", "75% - 89.9% (Distinction)", "90% & Above"]
    bands = pd.cut(passed["Best5_Percentage"], bins=bins, labels=labels, right=False)
    print(bands.value_counts().sort_index().to_string())

    print("\n================ TOP 5 PERFORMERS ================")
    top5 = passed.sort_values(
        by=["Best5_Percentage", "Total_Marks_All"], ascending=[False, False]
    ).head(5)
    display(top5[["Roll_No", "Candidate_Name", "Best5_Total_500", "Best5_Percentage", "Total_Marks_All", "Percentage_All"]])

    print("\n============= SUBJECT-WISE ANALYSIS =============")
    display(analysis_df)


# --- Colab Execution ---
print("Upload your CBSE Gazette .TXT file:")
uploaded = files.upload()

for filename in uploaded.keys():
    base = filename.rsplit(".", 1)[0]
    complete_csv = f"{base}_complete_result.csv"
    analysis_csv = f"{base}_subject_analysis.csv"

    df, sorted_codes = parse_cbse_gazette(filename)
    analysis_df = build_subject_analysis(df, sorted_codes)

    df.to_csv(complete_csv, index=False)
    analysis_df.to_csv(analysis_csv, index=False)

    print(f"\nExported:\n  1. {complete_csv}\n  2. {analysis_csv}")
    print_summary(df, analysis_df)

    # Download both CSVs (short pause prevents browser from blocking the second download)
    files.download(complete_csv)
    time.sleep(1)
    files.download(analysis_csv)