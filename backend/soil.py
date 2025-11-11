# app/routers/soil.py
from fastapi import APIRouter, UploadFile, File, HTTPException
from schemas.responses import SoilPredictResponse
from utils.images import read_imagefile, pil_to_cv2, cv2_to_pil, encode_png_b64
from models import SoilModel
from utils.settings import settings
import cv2
import numpy as np

router = APIRouter(prefix="/predict/soil", tags=["soil"])

_model: SoilModel | None = None


def get_model() -> SoilModel:
    global _model
    if _model is None:
        _model = SoilModel(settings.SOIL_MODEL_PATH)
    return _model


@router.post("", response_model=SoilPredictResponse)
async def predict_soil(file: UploadFile = File(...)):
    try:
        if not file or not file.filename:
            raise HTTPException(status_code=400, detail="No file uploaded")

        # decode image
        contents = await file.read()
        bgr = pil_to_cv2(read_imagefile(contents))
        h, w = bgr.shape[:2]

        model = get_model()
        boxes, mask, res = model.predict(bgr)

        annotated = bgr.copy()

        # --- draw bounding boxes with labels ---
        for b in boxes:
            p1 = (int(b["x1"]), int(b["y1"]))
            p2 = (int(b["x2"]), int(b["y2"]))
            cv2.rectangle(annotated, p1, p2, (0, 0, 255), 2)
            cv2.putText(
                annotated,
                f"{b['label']} {b['conf']:.2f}",
                (p1[0], max(0, p1[1] - 5)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (0, 0, 255),
                1,
                cv2.LINE_AA,
            )

        # --- if segmentation mask exists (YOLOv11) ---
        mask_png_b64 = None
        if mask is not None and mask.shape[:2] == (h, w):
            overlay = annotated.copy()
            overlay[mask > 0] = (255, 0, 0)  # blue tint for soil
            annotated = cv2.addWeighted(overlay, 0.35, annotated, 0.65, 0)

            # create a standalone transparent mask for soil
            mask_rgba = np.zeros((h, w, 4), dtype=np.uint8)
            mask_rgba[mask > 0] = (0, 0, 255, 160)
            mask_png_b64 = encode_png_b64(cv2_to_pil(mask_rgba))

        return SoilPredictResponse(
            width=w,
            height=h,
            boxes=boxes,
            annotated_png_b64=encode_png_b64(cv2_to_pil(annotated)),
            mask_png_b64=mask_png_b64,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Soil prediction failed: {e}")
