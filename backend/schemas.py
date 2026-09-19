from typing import Annotated, Literal, Self
from pydantic import BaseModel, ConfigDict, Field, FiniteFloat, field_validator, model_validator

INTENTS = {f"INT-{i:02d}" for i in range(1, 11)}

class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

class Point(StrictModel):
    x: FiniteFloat
    y: FiniteFloat
    z: FiniteFloat
    visibility: Annotated[FiniteFloat, Field(ge=0, le=1)] | None = None

class Frame(StrictModel):
    timestampMs: Annotated[FiniteFloat, Field(ge=0)]
    pose: Annotated[list[Point], Field(max_length=33)]
    leftHand: Annotated[list[Point], Field(max_length=21)]
    rightHand: Annotated[list[Point], Field(max_length=21)]
    face: Annotated[list[Point], Field(max_length=478)]

    @model_validator(mode="after")
    def point_counts(self) -> Self:
        for name, expected in (("pose", 33), ("leftHand", 21), ("rightHand", 21), ("face", 478)):
            if len(getattr(self, name)) not in (0, expected):
                raise ValueError("invalid_landmark_count")
        return self

def validate_timeline(frames: list[Frame], max_duration: int) -> list[Frame]:
    if frames[0].timestampMs != 0:
        raise ValueError("sequence_must_start_at_zero")
    if any(current.timestampMs <= previous.timestampMs for previous, current in zip(frames, frames[1:])):
        raise ValueError("timestamps_must_increase")
    if frames[-1].timestampMs > max_duration:
        raise ValueError("sequence_too_long")
    return frames

class InferenceRequest(StrictModel):
    packId: Annotated[str, Field(min_length=1, max_length=64)]
    frames: Annotated[list[Frame], Field(min_length=2, max_length=120)]

    @field_validator("frames")
    @classmethod
    def timeline(cls, value: list[Frame]) -> list[Frame]:
        return validate_timeline(value, 10_000)

class SampleSource(StrictModel):
    extractor: Literal["MediaPipe Holistic"]
    version: Literal["1.0.1"]
    coordinateSpace: Literal["normalized-image"]
    mirrored: Literal[False]

class DatasetSample(StrictModel):
    schemaVersion: Literal[1]
    signerId: Annotated[str, Field(pattern=r"^signer-[A-Za-z0-9_-]{1,40}$")]
    consentReference: Annotated[str, Field(pattern=r"^[A-Za-z0-9_-]{3,60}$")]
    region: Annotated[str, Field(min_length=1, max_length=80)]
    intentId: str
    split: Literal["train", "validation", "test"]
    reviewStatus: Literal["pending", "approved", "rejected"]
    source: SampleSource
    frames: Annotated[list[Frame], Field(min_length=2, max_length=600)]

    @field_validator("region")
    @classmethod
    def region_not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("region_required")
        return value.strip()

    @field_validator("intentId")
    @classmethod
    def supported_intent(cls, value: str) -> str:
        if value not in INTENTS:
            raise ValueError("unsupported_intent")
        return value

    @field_validator("frames")
    @classmethod
    def timeline(cls, value: list[Frame]) -> list[Frame]:
        return validate_timeline(value, 60_000)
