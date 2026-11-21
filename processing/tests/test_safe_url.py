import asyncio

import httpx

from app.core.config import Settings
from app.services.safe_url import is_public_url
from app.services.web_search import read_pages

PAGE = "<html><head><title>Article</title></head><body><p>Un texte.</p></body></html>"


def fake_resolver(table: dict[str, list[str]]):
    async def resolve(host: str, port: int) -> list[str]:
        if host not in table:
            raise OSError("introuvable")
        return table[host]

    return resolve


RESOLVE = fake_resolver(
    {
        "example.com": ["93.184.215.14"],
        "db": ["172.18.0.3"],
        "mixed.example": ["93.184.215.14", "10.0.0.5"],
        "mapped.example": ["::ffff:127.0.0.1"],
    }
)


def test_public_url_accepts_public_and_refuses_internal_addresses():
    async def check(url: str) -> bool:
        return await is_public_url(url, RESOLVE)

    assert asyncio.run(check("https://example.com/article"))
    for url in [
        "http://127.0.0.1:8000/",
        "http://localhost:3000/",
        "http://db:5432/",
        "http://169.254.169.254/latest/meta-data/",
        "http://[::1]/",
        "http://mixed.example/",
        "http://mapped.example/",
        "http://unknown.example/",
        "file:///etc/passwd",
    ]:
        assert not asyncio.run(check(url)), url


def test_read_pages_skips_internal_addresses_and_redirects_to_them():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/redirect":
            return httpx.Response(302, headers={"location": "http://169.254.169.254/secret"})
        return httpx.Response(200, headers={"content-type": "text/html"}, text=PAGE)

    settings = Settings(_env_file=None)
    pages = asyncio.run(
        read_pages(
            settings,
            [
                "https://example.com/ok",
                "https://example.com/redirect",
                "http://127.0.0.1/admin",
            ],
            transport=httpx.MockTransport(handler),
            resolve=RESOLVE,
        )
    )
    assert [page.url for page in pages] == ["https://example.com/ok"]
