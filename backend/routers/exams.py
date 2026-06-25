"""Exams – multi-question timed test sessions."""
import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

import models
from auth import get_admin_user, get_current_user
from database import get_db

router = APIRouter()


# ── Pydantic schemas ──────────────────────────────────────────────────────

class ExamCreate(BaseModel):
    title: str
    description: Optional[str] = None
    duration: Optional[int] = 90          # minutes
    start_time: Optional[datetime.datetime] = None
    end_time: Optional[datetime.datetime] = None
    is_for_all: bool = True
    problem_ids: List[int] = []           # ordered list of problem IDs
    # Proctoring
    tab_switch_detect:    bool = False
    copy_paste_disable:   bool = False
    f12_disable:          bool = False
    fullscreen_required:  bool = False
    window_switch_detect: bool = False
    block_paste:          bool = False


class ExamActiveUpdate(BaseModel):
    is_active: bool


# ── Helpers ───────────────────────────────────────────────────────────────

def _exam_dict(exam: models.Exam, include_problems: bool = False) -> dict:
    d = {
        "id":                   exam.id,
        "title":                exam.title,
        "description":          exam.description,
        "duration":             exam.duration,
        "start_time":           exam.start_time.isoformat()  if exam.start_time  else None,
        "end_time":             exam.end_time.isoformat()    if exam.end_time    else None,
        "is_active":            exam.is_active,
        "is_for_all":           exam.is_for_all,
        "created_at":           exam.created_at.isoformat(),
        "tab_switch_detect":    exam.tab_switch_detect,
        "copy_paste_disable":   exam.copy_paste_disable,
        "f12_disable":          exam.f12_disable,
        "fullscreen_required":  exam.fullscreen_required,
        "window_switch_detect": exam.window_switch_detect,
        "block_paste":          exam.block_paste,
        "problem_count":        len(exam.problems),
    }
    if include_problems:
        d["problems"] = [
            {
                "id":          ep.problem.id,
                "title":       ep.problem.title,
                "description": ep.problem.description,
                "topics":      ep.problem.topics,
                "difficulty":  ep.problem.difficulty,
                "starter_code":ep.problem.starter_code,
                "order_index": ep.order_index,
                "test_cases": [
                    {
                        "id":              tc.id,
                        "input_data":      tc.input_data,
                        "is_hidden":       tc.is_hidden,
                        "order_index":     tc.order_index,
                        # hide expected output for hidden cases (student view handled by caller)
                    }
                    for tc in sorted(ep.problem.test_cases, key=lambda t: t.order_index)
                ],
            }
            for ep in sorted(exam.problems, key=lambda e: e.order_index)
        ]
    return d


# ── Create ────────────────────────────────────────────────────────────────

@router.post("", status_code=201)
def create_exam(
    payload: ExamCreate,
    db: Session = Depends(get_db),
    admin=Depends(get_admin_user),
):
    exam = models.Exam(
        title=payload.title,
        description=payload.description,
        duration=payload.duration,
        start_time=payload.start_time,
        end_time=payload.end_time,
        is_for_all=payload.is_for_all,
        created_by=admin.id,
        tab_switch_detect=payload.tab_switch_detect,
        copy_paste_disable=payload.copy_paste_disable,
        f12_disable=payload.f12_disable,
        fullscreen_required=payload.fullscreen_required,
        window_switch_detect=payload.window_switch_detect,
        block_paste=payload.block_paste,
    )
    db.add(exam)
    db.flush()

    for i, pid in enumerate(payload.problem_ids):
        p = db.query(models.Problem).filter(models.Problem.id == pid).first()
        if not p:
            db.rollback()
            raise HTTPException(404, f"Problem {pid} not found")
        db.add(models.ExamProblem(exam_id=exam.id, problem_id=pid, order_index=i))

    db.commit()
    db.refresh(exam)
    return _exam_dict(exam)


# ── List ──────────────────────────────────────────────────────────────────

@router.get("")
def list_exams(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Exam)
    if not (include_inactive and current_user.role == "admin"):
        query = query.filter(models.Exam.is_active == True)
    exams = query.order_by(models.Exam.created_at.desc()).all()
    return [_exam_dict(e) for e in exams]


# ── Get single ────────────────────────────────────────────────────────────

@router.get("/{exam_id}")
def get_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(404, "Exam not found")
    data = _exam_dict(exam, include_problems=True)

    # For students: strip expected_output from hidden test cases
    if current_user.role != "admin":
        for prob in data.get("problems", []):
            for tc in prob.get("test_cases", []):
                if tc.get("is_hidden"):
                    tc.pop("expected_output", None)
    else:
        # admins always see expected_output
        for prob in data.get("problems", []):
            p_obj = db.query(models.Problem).filter(
                models.Problem.id == prob["id"]
            ).first()
            if p_obj:
                for tc_d, tc_obj in zip(
                    prob["test_cases"],
                    sorted(p_obj.test_cases, key=lambda t: t.order_index),
                ):
                    tc_d["expected_output"] = tc_obj.expected_output

    return data


# ── Update ────────────────────────────────────────────────────────────────

@router.put("/{exam_id}")
def update_exam(
    exam_id: int,
    payload: ExamCreate,
    db: Session = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(404, "Exam not found")

    for field in (
        "title", "description", "duration", "start_time", "end_time", "is_for_all",
        "tab_switch_detect", "copy_paste_disable", "f12_disable",
        "fullscreen_required", "window_switch_detect", "block_paste",
    ):
        setattr(exam, field, getattr(payload, field))

    # Replace problem links
    db.query(models.ExamProblem).filter(models.ExamProblem.exam_id == exam_id).delete()
    for i, pid in enumerate(payload.problem_ids):
        p = db.query(models.Problem).filter(models.Problem.id == pid).first()
        if not p:
            db.rollback()
            raise HTTPException(404, f"Problem {pid} not found")
        db.add(models.ExamProblem(exam_id=exam.id, problem_id=pid, order_index=i))

    db.commit()
    db.refresh(exam)
    return _exam_dict(exam)


# ── Toggle active ─────────────────────────────────────────────────────────

@router.patch("/{exam_id}/active")
def set_active(
    exam_id: int,
    payload: ExamActiveUpdate,
    db: Session = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(404, "Exam not found")
    exam.is_active = payload.is_active
    db.commit()
    db.refresh(exam)
    return _exam_dict(exam)


# ── Delete ────────────────────────────────────────────────────────────────

@router.delete("/{exam_id}")
def delete_exam(
    exam_id: int,
    db: Session = Depends(get_db),
    _admin=Depends(get_admin_user),
):
    exam = db.query(models.Exam).filter(models.Exam.id == exam_id).first()
    if not exam:
        raise HTTPException(404, "Exam not found")
    db.delete(exam)
    db.commit()
    return {"detail": "Deleted"}
