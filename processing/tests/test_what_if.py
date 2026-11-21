"""What If ? : sans IA, chaque affaire de démo a ses versions de secours, et la forme est stable."""

import pytest
from fastapi.testclient import TestClient


def _run(client: TestClient, variant: str | None) -> dict:
    body = {"payload": {"claim": "x", "kind": "real", "evidence": []}, "fallbackVariant": variant}
    response = client.post("/v1/prompts/what-if", json=body)
    assert response.status_code == 200
    assert response.json()["source"] == "fallback"
    return response.json()["result"]


@pytest.mark.parametrize(
    ("variant", "ids"),
    [
        ("flood", ["calm"]),
        ("water", ["calm"]),
        ("hiring", ["faithful", "alarmist", "misleading"]),
        (None, ["calm"]),
    ],
)
def test_what_if_fallback_per_demo_case(
    offline_client: TestClient, variant: str | None, ids: list[str]
) -> None:
    result = _run(offline_client, variant)
    assert [version["id"] for version in result["versions"]] == ids
    assert all(version["text"] and version["changes"] for version in result["versions"])
    assert result["takeaway"]
