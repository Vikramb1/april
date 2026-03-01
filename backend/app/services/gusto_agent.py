import httpx
from browser_use_sdk import AsyncBrowserUse

from app.config import settings


def _client() -> AsyncBrowserUse:
    return AsyncBrowserUse(api_key=settings.browser_use_api_key)


async def start_gusto_login() -> dict:
    """Log into Gusto with stored credentials. Pauses at MFA screen.

    Returns {"session_id": str, "live_url": str, "profile_id": str}
    The user should open live_url, enter the MFA code, then call
    complete_gusto_login() to continue.
    """
    client = _client()

    profile = await client.profiles.create(name="gusto")
    session = await client.sessions.create(profile_id=profile.id)

    # Log in with email/password — will stop at MFA
    await client.run(
        task=(
            "Go to https://app.gusto.com/login. "
            "Enter the email and password from the provided secrets. "
            "Click the Sign In button. "
            "You will likely see a two-factor authentication / authenticator code screen. "
            "Once you see the MFA/2FA/authenticator screen, STOP immediately. "
            "Do not try to enter any code."
        ),
        session_id=session.id,
        secrets={"email": settings.gusto_email, "password": settings.gusto_password},
    )

    return {
        "profile_id": str(profile.id),
        "session_id": str(session.id),
        "live_url": session.live_url,
    }


async def fetch_w2_from_session(session_id: str) -> bytes:
    """After MFA is complete, use the same session to find and download the W-2.

    Returns raw PDF bytes.
    Raises RuntimeError if no file was downloaded.
    """
    client = _client()

    result = await client.run(
        task=(
            "You are logged into Gusto and on the dashboard. "
            "Look for the most recent W-2 form. It should be visible under "
            "'Recent Documents' on the dashboard/home page. "
            "Click on the W-2 document to download it as a PDF."
        ),
        session_id=session_id,
    )

    await client.sessions.stop(session_id)

    if not result.output_files:
        raise RuntimeError(
            f"No W-2 PDF was downloaded. Agent output: {result.output}"
        )

    file_info = result.output_files[0]
    presigned_url = file_info.url

    async with httpx.AsyncClient() as http:
        resp = await http.get(presigned_url)
        resp.raise_for_status()
        return resp.content
