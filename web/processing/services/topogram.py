from pathlib import Path
import pydicom


def find_topograms(study_dir):
    topograms = []

    for file_path in Path(study_dir).rglob("*"):
        if not file_path.is_file():
            continue

        try:
            ds = pydicom.dcmread(
                file_path,
                stop_before_pixels=True,
                force=True
            )
        except Exception:
            continue

        image_type = [
            str(value).upper()
            for value in getattr(ds, "ImageType", [])
        ]

        if "LOCALIZER" in image_type:
            topograms.append({
                "path": file_path,
                "series_uid": str(
                    getattr(ds, "SeriesInstanceUID", "")
                ),
                "series_description": str(
                    getattr(ds, "SeriesDescription", "")
                ),
            })

    return topograms

