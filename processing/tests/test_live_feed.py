"""Fil d'actualité réel : chaque source est ramenée à une même forme, sans réseau dans les tests."""

from fastapi.testclient import TestClient

from app.services.live_feed import (
    clean_summary,
    page_image,
    parse_facebook,
    parse_google_trends,
    parse_mastodon,
    parse_youtube,
)
from app.services.news_feeds import parse_feed

RSS = """<rss xmlns:media="http://search.yahoo.com/mrss/"><channel>
<item><title>Avec media</title><link>https://a.mg/1</link>
<media:content url="https://a.mg/petite.jpg" medium="image" width="300"/>
<media:content url="https://a.mg/grande.jpg" medium="image" width="1200"/></item>
<item><title>Avec image dans le texte</title><link>https://a.mg/2</link>
<description><![CDATA[<p><img src="https://a.mg/texte.jpg"/> Bonjour</p>]]></description></item>
<item><title>Sans image</title><link>https://a.mg/3</link></item>
</channel></rss>"""


def test_rss_image_prefers_the_widest_media_then_the_text() -> None:
    images = [item.image_url for item in parse_feed(RSS, "A")]
    assert images == ["https://a.mg/grande.jpg", "https://a.mg/texte.jpg", None]


def test_wordpress_footer_is_removed() -> None:
    text = "Le texte. L\u2019article Titre est apparu en premier sur Midi Madagasikara."
    assert clean_summary(f"Cliquez pour agrandir {text}") == "Le texte."


def test_page_image_reads_og_image_in_any_attribute_order() -> None:
    assert page_image('<meta property="og:image" content="https://x/a.jpg">') == "https://x/a.jpg"
    assert page_image('<meta content="https://x/b.jpg" name="twitter:image">') == "https://x/b.jpg"
    assert page_image("<html></html>") is None


def test_youtube_keeps_views_and_thumbnail() -> None:
    xml = """<feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
    <entry><title>LE JOURNAL DU 20 NOVEMBRE</title>
    <link rel="alternate" href="https://www.youtube.com/watch?v=abc"/>
    <published>2026-11-20T18:06:18+00:00</published>
    <media:group><media:description>LE JOURNAL DU 20 NOVEMBRE</media:description>
    <media:thumbnail url="https://i2.ytimg.com/vi/abc/hqdefault.jpg"/>
    <media:community><media:statistics views="15499"/></media:community></media:group>
    </entry></feed>"""
    [video] = parse_youtube(xml, "TV Plus")
    assert video.reach == 15499
    assert video.image_url == "https://i2.ytimg.com/vi/abc/hqdefault.jpg"
    assert video.text == ""


def _status(**overrides: object) -> dict[str, object]:
    status: dict[str, object] = {
        "url": "https://piaille.fr/@ana/1",
        "content": "<p>Coupure d'eau annoncée dans plusieurs quartiers d'Antananarivo demain.</p>",
        "language": "fr",
        "created_at": "2026-11-21T09:01:15.000Z",
        "account": {"acct": "ana"},
        "reblogs_count": 4,
        "media_attachments": [],
    }
    status.update(overrides)
    return status


def test_mastodon_skips_sensitive_short_and_foreign_posts() -> None:
    statuses = [
        _status(),
        _status(sensitive=True),
        _status(content="<p>#Madagascar #Antananarivo</p>"),
        _status(language="es"),
    ]
    [post] = parse_mastodon(statuses, "Mastodon", "piaille.fr")
    assert post.author == "@ana@piaille.fr"
    assert post.reach == 4


def test_google_trends_lists_headlines_and_searches() -> None:
    xml = """<rss xmlns:ht="https://trends.google.com/trending/rss"><channel><item>
    <title>ruffin</title><ht:approx_traffic>2K+</ht:approx_traffic>
    <pubDate>Sat, 21 Nov 2026 08:20:00 -0800</pubDate>
    <ht:picture>https://g/p.jpg</ht:picture>
    <ht:news_item><ht:news_item_title>Ruffin renonce</ht:news_item_title>
    <ht:news_item_source>Le Monde</ht:news_item_source></ht:news_item>
    </item></channel></rss>"""
    [trend] = parse_google_trends(xml, "Tendances France", "FR")
    assert trend.reach == 2000
    assert trend.text == "Ruffin renonce (Le Monde)"
    assert trend.url.endswith("q=ruffin&geo=FR")


def test_facebook_names_groups_and_pages_but_never_people() -> None:
    long_text = "Fiara roa vaovao ho an'Antananarivo, 15 000 litatra avy ny iray, hoy ny ministera."
    results = [
        {
            "url": "https://www.facebook.com/groups/1689/posts/47",
            "title": "VAOVAO ETO MADAGASIKARA - Facebook",
            "content": f"{long_text} · Other posts · autre chose",
        },
        {
            "url": "https://www.facebook.com/anna.zak.5268/videos/1",
            "title": "Anna Zak - Facebook",
            "content": long_text,
        },
        {"url": "https://www.facebook.com/fb-answers/x", "title": "x", "content": long_text},
        {
            "url": "https://www.facebook.com/groups/117/posts/2",
            "title": "Vaovao eto Madagasikara | - Facebook",
            "content": long_text,
        },
        {
            "url": "https://www.facebook.com/GenZActus/posts/vaovao",
            "title": "VAOVAO MAHAFALY! Mbola mampiakatra ... - Facebook",
            "content": long_text,
        },
    ]
    group, person, other_group, page = parse_facebook(results, "Facebook")
    assert group.author == "Groupe public « VAOVAO ETO MADAGASIKARA »"
    assert group.text == long_text
    assert person.author == "Page ou profil public"
    assert other_group.author == "Groupe public « Vaovao eto Madagasikara »"
    assert page.author == "Page « GenZActus »"


def test_live_feed_is_empty_offline(offline_client: TestClient) -> None:
    response = offline_client.post(
        "/v1/live-feed",
        json={"sources": [{"type": "rss", "target": "https://a.mg/feed", "name": "A"}]},
    )
    assert response.status_code == 200
    assert response.json() == {"items": [], "sources_read": 0}


def test_facebook_video_pages_keep_views_and_real_date() -> None:
    content = (
        "Title: 17K views · 667 reactions | Inona no azo ambara | JOUR NA ALINA # Video. "
        "Sorry, we're having trouble with playing this video. Inona no azo ambara ho an'ilay "
        "olona ohatran'izao ireny, hoy ny mpanoratra. ## **JOUR NA ALINA**. "
        "Tuesday, August 18, 2026 at 3:10 AM. ## Comments. Tena maître"
    )
    [video] = parse_facebook(
        [
            {
                "url": "https://www.facebook.com/FitiavanTANINDRAZANA/videos/1",
                "title": "17K views · 667 reactions | Inona no azo ambara | JOUR NA ALINA",
                "content": content,
            }
        ],
        "Facebook",
    )
    assert video.reach == 17000
    assert video.published_at == "2026-08-18T00:00:00+00:00"
    assert "Comments" not in video.text
    assert "Sorry" not in video.text
