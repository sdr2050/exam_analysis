# EXAM ANALYSIS — CBSE Gazette Performance & Result Workbench

Analyze CBSE Class 12 School/Roll-No-wise Gazette `.TXT` files to produce visual performance insights, grade distributions, subject-wise breakdowns, interactive filter and pivot analyses, individual student scorecards, and Python-compatible CSV exports.

## Deploy on Streamlit Community Cloud

1. Push this repository to GitHub.
2. Open [share.streamlit.io](https://share.streamlit.io/) and click **New app**.
3. Select your repository and branch, and set **Main file path** to:
   ```text
   streamlit_app.py
   ```
4. Click **Deploy**. Streamlit Cloud will automatically install `requirements.txt` and apply the light academic theme from `.streamlit/config.toml`.

## Run Streamlit Locally

```bash
pip install -r requirements.txt
streamlit run streamlit_app.py
```

## Included Features

- **Executive Overview**: Pass rate, Mean/Median/Highest/Lowest Best-5 %, Distinction share, Performance Band distribution, Overall CBSE Grade distribution (`A1`–`E`), automated academic audit insights, and Top 5 Performers.
- **Subject Breakdown**: Subject mean vs. school benchmark comparison, 100% stacked grade distribution (`A1`–`E`), and complete subject statistics table.
- **Custom Analysis & Pivot Builder**: Deterministic, no-AI cohort filter workbench with quick presets, dynamic Row × Column × Metric cross-tabulation, synchronized charts, and CSV exports.
- **Student Register & Scorecard**: Searchable student register and individual candidate scorecards comparing subject marks against school averages.
- **Exports**: Download `<filename>_complete_result.csv`, `<filename>_subject_analysis.csv`, and a formatted printable HTML report (open and print to PDF).
