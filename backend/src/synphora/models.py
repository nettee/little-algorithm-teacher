from enum import Enum

from pydantic import BaseModel


class ArtifactType(str, Enum):
    PROBLEM = "problem"
    COURSE = "course"
    MIND_MAP = "mind_map"
    EXPLANATION = "explanation"
    SOLUTION_CODE = "solution_code"
    OTHER = "other"


class ArtifactRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"


class ArtifactData(BaseModel):
    id: str
    role: ArtifactRole
    type: ArtifactType
    title: str
    description: str | None = None
    content: str
    created_at: str
    updated_at: str


class EvaluateType(str, Enum):
    COMMENT = "comment"
    TITLE = "title"
    INTRODUCTION = "introduction"
