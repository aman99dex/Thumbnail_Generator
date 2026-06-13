import os
import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models import Job, Thumbnail

from services.generator import process_job, STYLE_ORDER
from services.imagekit_service import upload_file, get_variants



logger = logging.getLogger(__name__)
