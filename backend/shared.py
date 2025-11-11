# backend/models/shared.py
import torch

device = "cuda" if torch.cuda.is_available() else "cpu"
