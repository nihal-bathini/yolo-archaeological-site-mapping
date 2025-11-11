# models/__init__.py
from .vegetation import VegetationSegModel
from .soil import SoilModel
# models/shared.py
import torch


device = "cuda" if torch.cuda.is_available() else "cpu"