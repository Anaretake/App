from django.http import JsonResponse, HttpResponse
from django.conf import settings
from studies.models import Study
from .services.topogram import find_topograms

import pydicom
import numpy as np
from PIL import Image
from io import BytesIO


def detect_topogram(request, study_id):

    if request.method != "POST":
        return JsonResponse(
            {"error": "Метод не поддерживается"},status=405)


    try:
        study = Study.objects.get(
            id=study_id)

    except Study.DoesNotExist:
        return JsonResponse(
            {"error": "Исследование не найдено"},
            status=404)

    study_dir = ( settings.MEDIA_ROOT/ study.data_path)

    topograms = find_topograms(study_dir)

    if not topograms:
        return JsonResponse({"error": "Топограмма не найдена"},status=404)

    topogram = topograms[0]

    return JsonResponse({
        "success": True,
        "path": str(topogram["path"]),
        "series_uid": topogram["series_uid"],
        "series_description": topogram["series_description"],
        "image_url": f"/topogram-image/{study_id}/"
    })

def normalize_topogram(image):
    
    image = image.astype(np.float32)
    pixels = image[image > 0]
    if pixels.size == 0:
        return np.zeros_like(image,dtype=np.uint8)

    low = np.percentile( pixels,1)

    high = np.percentile(pixels,99)

    if high <= low:

         return np.zeros_like(image,dtype=np.uint8)

    image = ((image - low)/ (high - low)* 255)
    image = np.clip(image, 0,255)
    image = image.astype( np.uint8)

    return image

def topogram_image(request, study_id):
    try:
        study = Study.objects.get(id=study_id)

    except Study.DoesNotExist:
        return HttpResponse("Исследование не найдено",status=404)

    study_dir = (settings.MEDIA_ROOT/ study.data_path)
    topograms = find_topograms(study_dir)

    if not topograms:
        return HttpResponse("Топограмма не найдена",status=404)

    topogram_path = topograms[0]["path"]

    try:

        ds = pydicom.dcmread(topogram_path)
        image = ds.pixel_array.astype(np.float32)

        image = normalize_topogram(image)
        if getattr(ds,"PhotometricInterpretation","") == "MONOCHROME1":

            image = 255 - image
        pil_image = Image.fromarray(image)

        buffer = BytesIO()
        pil_image.save(buffer,format="PNG")

        return HttpResponse(buffer.getvalue(),content_type="image/png")

    except Exception as e:
        print("Ошибка отображения топограммы:",e)
        return HttpResponse("Ошибка отображения топограммы",status=500)

def classify_study(request, study_id):

    if request.method != "POST":

        return JsonResponse(
            {"error": "Метод не поддерживается"}, status=405)

    return JsonResponse({
        "success": True,
        "study_id": study_id,
        "status": "классификация запущена",
        "message": "Это пока заглушка"
    })
