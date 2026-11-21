"""Garde-fou des pages lues à la demande : jamais d'adresse interne.

Une adresse venue de l'extérieur (lien collé, extension du navigateur) ne doit pas faire lire au
serveur ses voisins du réseau (base de données, service de traitement, métadonnées du cloud). On
résout le nom et on refuse dès qu'UNE adresse n'est pas publique. Le contrôle s'applique à chaque
requête, redirections comprises (crochet `request` de httpx).

Limite connue : entre la résolution et la connexion, un DNS piégé pourrait changer de réponse.
"""

import asyncio
import ipaddress
import socket
from collections.abc import Awaitable, Callable
from urllib.parse import urlsplit

import httpx

Resolver = Callable[[str, int], Awaitable[list[str]]]


class BlockedAddressError(httpx.RequestError):
    """Adresse refusée : interne, privée, locale ou introuvable."""


async def resolve_host(host: str, port: int) -> list[str]:
    infos = await asyncio.get_running_loop().getaddrinfo(host, port, type=socket.SOCK_STREAM)
    return [str(info[4][0]) for info in infos]


def _is_public(address: str) -> bool:
    ip = ipaddress.ip_address(address.split("%")[0])
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    return ip.is_global and not ip.is_multicast


async def is_public_url(url: str, resolve: Resolver = resolve_host) -> bool:
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https"):
        return False
    host = (parts.hostname or "").lower().rstrip(".")
    if not host or host == "localhost" or host.endswith((".localhost", ".internal", ".local")):
        return False
    try:
        port = parts.port or (443 if parts.scheme == "https" else 80)
        addresses = await resolve(host, port)
    except (OSError, ValueError):
        return False
    try:
        return bool(addresses) and all(_is_public(address) for address in addresses)
    except ValueError:
        return False


def public_only_hook(resolve: Resolver = resolve_host):
    """Crochet httpx : refuse toute requête (redirections comprises) vers une adresse interne."""

    async def guard(request: httpx.Request) -> None:
        if not await is_public_url(str(request.url), resolve):
            raise BlockedAddressError("adresse interne refusée", request=request)

    return guard
