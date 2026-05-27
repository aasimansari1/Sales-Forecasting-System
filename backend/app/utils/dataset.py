import io
import os
import pandas as pd


def load_dataset_df(dataset) -> pd.DataFrame:
    """Load a dataset into a DataFrame. Uses file if available, falls back to DB content."""
    if os.path.exists(dataset.file_path):
        try:
            if dataset.file_path.endswith((".xlsx", ".xls")):
                return pd.read_excel(dataset.file_path)
            return pd.read_csv(dataset.file_path, encoding="utf-8", on_bad_lines="skip")
        except Exception:
            pass

    if dataset.file_content:
        try:
            return pd.read_csv(io.StringIO(dataset.file_content), encoding="utf-8", on_bad_lines="skip")
        except Exception as e:
            raise ValueError(f"Could not parse stored dataset content: {e}")

    raise FileNotFoundError(f"Dataset file not found and no stored content available (id={dataset.id})")
