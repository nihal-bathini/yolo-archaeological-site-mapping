# app/routers/vegetation.py
from fastapi import APIRouter, UploadFile, File, HTTPException
from schemas.responses import VegetationPredictResponse
from utils.images import (
    read_imagefile, pil_to_cv2, cv2_to_pil,
    encode_png_b64, overlay_mask
)
from models import VegetationSegModel
from utils.settings import settings
import numpy as np
import cv2
import time

router = APIRouter(prefix="/predict/vegetation", tags=["vegetation"])

_model: VegetationSegModel | None = None


def get_model() -> VegetationSegModel:
    global _model
    if _model is None:
        _model = VegetationSegModel(settings.VEG_MODEL_PATH)
    return _model


@router.post("", response_model=VegetationPredictResponse)
async def predict_vegetation(file: UploadFile = File(...)):
    try:
        if not file or not file.filename:
            raise HTTPException(status_code=400, detail="No file uploaded")

        # --- timer start ---
        t0 = time.time()

        contents = await file.read()
        pil = read_imagefile(contents)
        bgr = pil_to_cv2(pil)
        h, w = bgr.shape[:2]

        model = get_model()
        mask = model.predict_mask(bgr)  # (h, w)

        # --- resize if needed ---
        if mask.shape != (h, w):
            mask = cv2.resize(
                mask.astype(np.uint8),
                (w, h),
                interpolation=cv2.INTER_NEAREST,
            )

        # --- overlay visualization ---
        overlay = overlay_mask(bgr, mask, alpha=0.45, color=(0, 200, 0))

        # --- coverage percentage ---
        mask_bin = np.where(mask > 0.5 * mask.max(), 1, 0).astype(np.uint8)
        coverage = float(mask_bin.mean() * 100.0)



        # --- segment counting using connected components ---
        # ensure mask is binary
        mask_binary = (mask > 0).astype(np.uint8)
        num_labels, _ = cv2.connectedComponents(mask_binary)
        # connectedComponents counts background as label 0, so subtract 1
        segments = max(num_labels - 1, 0)

        # --- compute elapsed time ---
        processing_time = round(time.time() - t0, 3)

        # --- create RGBA mask ---
        mask_rgba = np.zeros((h, w, 4), dtype=np.uint8)
        mask_rgba[mask > 0] = (0, 255, 0, 180)

        return VegetationPredictResponse(
            width=w,
            height=h,
            mask_png_b64=encode_png_b64(cv2_to_pil(mask_rgba)),
            overlay_png_b64=encode_png_b64(cv2_to_pil(overlay)),
            image_base64=encode_png_b64(cv2_to_pil(overlay)),
            coverage_pct=coverage,
            segments=segments,
            processingTime=processing_time,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Vegetation prediction failed: {e}")
