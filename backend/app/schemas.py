"""Pydantic request/response models for the Pitch Angle Finder API."""

from pydantic import BaseModel, Field


class PitchRequest(BaseModel):
    description: str = Field(
        ...,
        min_length=20,
        max_length=2000,
        description="A description of the company or product to generate PR pitch angles for.",
    )


class PitchAngle(BaseModel):
    headline: str = Field(..., description="A short, punchy working headline for the angle.")
    angle: str = Field(..., description="The pitch angle itself: what the story is and how it's framed.")
    why_it_works: str = Field(
        ..., description="Why a journalist would plausibly cover this: the concrete newsworthiness reasoning."
    )
    newsworthy_hook: str = Field(
        ...,
        description="The primary newsworthiness factor this angle leans on, e.g. 'Timeliness', 'Data & surprise factor', 'Human interest', 'Industry relevance'.",
    )
    target_beat: str = Field(
        ..., description="The kind of reporter/outlet this would realistically be pitched to."
    )


class PitchResponse(BaseModel):
    angles: list[PitchAngle]
