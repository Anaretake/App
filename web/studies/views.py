from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import ensure_csrf_cookie
from django.conf import settings

from .models import Study

from pathlib import Path
from uuid import uuid4

import pydicom
from pydicom.uid import generate_uid


@ensure_csrf_cookie
def home(request):
    return render(request, "studies/studies.html")


def get_initials(patient_name):
    """
    Формирование инициалов пациента.
    """

    parts = str(patient_name).replace("^", " ").split()

    return "".join(
        part[0].upper()
        for part in parts
        if part
    )


def anonymize_dicom(
    ds,
    anonymized_name,
    study_uid_map,
    series_uid_map,
    sop_uid_map,
):
    """
    Анонимизация одного DICOM-файла.
    """


    ds.PatientName = anonymized_name
    ds.PatientID = anonymized_name

    old_study_uid = str(
        getattr(ds, "StudyInstanceUID", "")
    )

    if old_study_uid:

        if old_study_uid not in study_uid_map:
            study_uid_map[old_study_uid] = generate_uid()

        ds.StudyInstanceUID = (
            study_uid_map[old_study_uid]
        )


    old_series_uid = str(
        getattr(ds, "SeriesInstanceUID", "")
    )

    if old_series_uid:

        if old_series_uid not in series_uid_map:
            series_uid_map[old_series_uid] = generate_uid()

        ds.SeriesInstanceUID = (
            series_uid_map[old_series_uid]
        )



    old_sop_uid = str(
        getattr(ds, "SOPInstanceUID", "")
    )

    if old_sop_uid:

        if old_sop_uid not in sop_uid_map:
            sop_uid_map[old_sop_uid] = generate_uid()

        ds.SOPInstanceUID = (
            sop_uid_map[old_sop_uid]
        )


    if hasattr(ds, "file_meta"):

        if hasattr(ds, "SOPClassUID"):
            ds.file_meta.MediaStorageSOPClassUID = (
                ds.SOPClassUID
            )

        if hasattr(ds, "SOPInstanceUID"):
            ds.file_meta.MediaStorageSOPInstanceUID = (
                ds.SOPInstanceUID
            )


    tags_to_remove = [

        # Информация об учреждении
        "InstitutionName",
        "InstitutionAddress",
        "InstitutionalDepartmentName",

        # Направляющий врач
        "ReferringPhysicianName",
        "ReferringPhysicianAddress",
        "ReferringPhysicianTelephoneNumbers",
        "ReferringPhysicianIdentificationSequence",

        # Выполняющий врач
        "PerformingPhysicianName",
        "PerformingPhysicianIdentificationSequence",

        # Оператор
        "OperatorsName",
        "OperatorIdentificationSequence",

        # Дополнительные идентификаторы пациента
        "OtherPatientIDs",
        "OtherPatientNames",

        # Контактные данные пациента
        "PatientAddress",
        "PatientTelephoneNumbers",

        # Дополнительные имена пациента
        "PatientBirthName",
        "PatientMotherBirthName",

        # Дополнительная информация
        "AdmittingDiagnosesDescription",
        "AdditionalPatientHistory",
    ]

    for keyword in tags_to_remove:

        if hasattr(ds, keyword):
            del ds[keyword]


    ds.remove_private_tags()

    ds.PatientIdentityRemoved = "YES"

    ds.DeidentificationMethod = (
        "DICOM de-identification; "
        "patient identifiers removed; "
        "institution and personnel identifiers removed; "
        "UIDs replaced"
    )

    return ds


def upload_study(request):

    if request.method != "POST":
        return JsonResponse(
            {"error": "Метод не поддерживается"},
            status=405
        )

    files = request.FILES.getlist("studyFolder")

    if not files:
        return JsonResponse(
            {"error": "Файлы не выбраны"},
            status=400
        )

    patient_name = None
    accession_number = None
    study_uid = None

    for file in files:

        try:

            ds = pydicom.dcmread(
                file,
                stop_before_pixels=True
            )

            if hasattr(ds, "PatientName"):
                value = str(ds.PatientName)

                if value:
                    patient_name = value

            if hasattr(ds, "AccessionNumber"):

                value = str(ds.AccessionNumber)

                if value:
                    accession_number = value

            if hasattr(ds, "StudyInstanceUID"):

                value = str(ds.StudyInstanceUID)

                if value:
                    study_uid = value

            if patient_name and study_uid:
                break

        except Exception:
            continue

    if not patient_name:

        return JsonResponse(
            {"error": "Не найден PatientName"},
            status=400
        )

    if not study_uid:

        return JsonResponse(
            {"error": "Не найден StudyInstanceUID"},
            status=400
        )

    initials = get_initials(patient_name)


    if accession_number:

        study_number = accession_number

    else:

        study_number = (
            f"STUDY-{uuid4().hex[:12].upper()}"
        )

    anonymized_name = (
        f"{initials}_{study_number}"
    )


    study = Study.objects.create(
        status="анонимизация",
        file_count=0,
        anonymized_patient_name=anonymized_name,
        accession_number=study_number
    )

    study_dir = (
        Path(settings.MEDIA_ROOT)
        / "studies"
        / str(study.id)
        / "anonymized"
    )

    study_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    study_uid_map = {}
    series_uid_map = {}
    sop_uid_map = {}

    file_count = 0

    for file in files:

        try:

            if not file.name.lower().endswith(".dcm"):
                continue

            input_path = (
                study_dir
                / f"input_{file_count + 1:06d}.dcm"
            )


            with open(input_path, "wb") as f:

                for chunk in file.chunks():
                    f.write(chunk)

            ds = pydicom.dcmread(
                input_path,
                force=True
            )

            ds = anonymize_dicom(
                ds=ds,
                anonymized_name=anonymized_name,
                study_uid_map=study_uid_map,
                series_uid_map=series_uid_map,
                sop_uid_map=sop_uid_map,
            )

            for tag in list(ds.keys()):

                if tag.group == 0x0000:
                    del ds[tag]


            output_path = (
                study_dir
                / (
                    f"{anonymized_name}_"
                    f"{file_count + 1:06d}.dcm"
                )
            )

            ds.save_as(
                output_path,
                write_like_original=False
            )

            input_path.unlink()

            file_count += 1

        except Exception as e:

            print(
                "Ошибка обработки файла:",
                file.name
            )

            print(e)

            try:

                if input_path.exists():
                    input_path.unlink()

            except Exception:
                pass

            continue

   
    study.file_count = file_count

    study.data_path = str(
        study_dir.relative_to(
            settings.MEDIA_ROOT
        )
    )

    study.status = "анонимизировано"

    study.save()

    return JsonResponse({
    "success": True,
    "study_id": study.id,
    "patient_name": anonymized_name,
    "accession_number": study_number,
    "file_count": file_count,
    "status": study.status,

    "anonymization": {
        "changed": [
            "PatientName",
            "PatientID",
            "StudyInstanceUID",
            "SeriesInstanceUID",
            "SOPInstanceUID"
        ],

        "removed": [
            "InstitutionName",
            "InstitutionAddress",
            "InstitutionalDepartmentName",
            "ReferringPhysicianName",
            "ReferringPhysicianAddress",
            "ReferringPhysicianTelephoneNumbers",
            "ReferringPhysicianIdentificationSequence",
            "PerformingPhysicianName",
            "PerformingPhysicianIdentificationSequence",
            "OperatorsName",
            "OperatorIdentificationSequence",
            "OtherPatientIDs",
            "OtherPatientNames",
            "PatientAddress",
            "PatientTelephoneNumbers",
            "PatientBirthName",
            "PatientMotherBirthName",
            "AdmittingDiagnosesDescription",
            "AdditionalPatientHistory"
        ]
    }
})
def study_list(request):

    studies =Study.objects.all().order_by("-created_at")

    return JsonResponse({

        "success": True,
        "studies": [

            {
                "id": study.id,
                "patient_name":
                    study.anonymized_patient_name,
                "accession_number":
                    study.accession_number,
                "file_count":
                    study.file_count,
                "status":
                    study.status,
                "created_at":
                    study.created_at.strftime(
                        "%d.%m.%Y %H:%M"
                    )
            }

            for study in studies

        ]

    })