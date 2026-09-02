"""Structural smoke test: verifies the FastAPI app, schema validation, and
request/response wiring work correctly, using a mocked Groq response so it
doesn't require a real GROQ_API_KEY. This is NOT a replacement for testing
against the real Groq API -- it only proves the plumbing is correct.
"""

import json
from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

FAKE_GROQ_JSON = json.dumps(
    {
        "angles": [
            {
                "headline": "Local Startup Cuts Grocery Delivery Emissions by Routing Around Traffic Patterns",
                "angle": "Pitch the company's routing algorithm as a data story about urban delivery "
                "emissions, using their own before/after routing data as the hook.",
                "why_it_works": "Local business and climate reporters both cover last-mile delivery "
                "emissions right now, and a concrete before/after number gives them a chartable stat.",
                "newsworthy_hook": "Data & surprise factor",
                "target_beat": "Local business press and climate/mobility trade outlets",
            },
            {
                "headline": "Why This Founder Quit a Big Logistics Job to Fix Grocery Delivery Waste",
                "angle": "A founder-story pitch centered on the personal motivation behind starting "
                "the company, tied to a broader trend of operators leaving incumbents to fix known "
                "inefficiencies.",
                "why_it_works": "Founder-journey pieces are a reliable staple for trade press profiles, "
                "especially when tied to a specific inefficiency the founder saw firsthand.",
                "newsworthy_hook": "Human interest",
                "target_beat": "Trade press founder profiles, e.g. sector-specific newsletters",
            },
        ]
    }
)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_root():
    response = client.get("/")
    assert response.status_code == 200


def test_pitch_angles_happy_path():
    fake_message = MagicMock()
    fake_message.content = FAKE_GROQ_JSON
    fake_choice = MagicMock()
    fake_choice.message = fake_message
    fake_completion = MagicMock()
    fake_completion.choices = [fake_choice]

    fake_client = MagicMock()
    fake_client.chat.completions.create.return_value = fake_completion

    with patch("app.main.get_client", return_value=fake_client):
        response = client.post(
            "/api/pitch-angles",
            json={
                "description": "We built a route-optimization app for grocery delivery drivers "
                "that cuts average delivery time and fuel use by rerouting around live traffic."
            },
        )

    assert response.status_code == 200
    data = response.json()
    assert len(data["angles"]) == 2
    assert data["angles"][0]["newsworthy_hook"] == "Data & surprise factor"
    assert "target_beat" in data["angles"][1]

    # confirm the real prompt-building path was actually exercised
    call_kwargs = fake_client.chat.completions.create.call_args.kwargs
    assert call_kwargs["response_format"] == {"type": "json_object"}
    assert "grocery delivery" in call_kwargs["messages"][1]["content"]
    assert "TIMELINESS" in call_kwargs["messages"][0]["content"]


def test_pitch_angles_rejects_short_input():
    response = client.post("/api/pitch-angles", json={"description": "too short"})
    assert response.status_code == 422


def test_pitch_angles_handles_bad_json_from_groq():
    fake_message = MagicMock()
    fake_message.content = "not valid json {{"
    fake_choice = MagicMock()
    fake_choice.message = fake_message
    fake_completion = MagicMock()
    fake_completion.choices = [fake_choice]

    fake_client = MagicMock()
    fake_client.chat.completions.create.return_value = fake_completion

    with patch("app.main.get_client", return_value=fake_client):
        response = client.post(
            "/api/pitch-angles",
            json={"description": "A description that is definitely long enough to pass validation."},
        )

    assert response.status_code == 502
