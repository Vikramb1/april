import logging
import httpx
try:
    from browser_use_sdk import AsyncBrowserUse
except ImportError:
    AsyncBrowserUse = None  # type: ignore

from app.config import settings

logger = logging.getLogger("uvicorn")

BROWSER_USE_API = "https://api.browser-use.com/api/v3"


def _client() -> AsyncBrowserUse:
    return AsyncBrowserUse(api_key=settings.browser_use_api_key)


async def _fetch_session_file(session_id: str) -> bytes | None:
    """Fallback: list files in the session workspace and download the first PDF."""
    api_key = settings.browser_use_api_key
    async with httpx.AsyncClient(timeout=60) as http:
        resp = await http.get(
            f"{BROWSER_USE_API}/sessions/{session_id}/files",
            params={"includeUrls": "true"},
            headers={"Authorization": f"Bearer {api_key}"},
        )
        if resp.status_code != 200:
            logger.warning(f"Session files list failed ({resp.status_code}): {resp.text}")
            return None
        data = resp.json()
        files = data.get("files", [])
        # Find the first PDF file
        pdf_file = next(
            (f for f in files if f.get("path", "").lower().endswith(".pdf") and f.get("url")),
            None,
        )
        if not pdf_file:
            logger.warning(f"No PDF found in session files: {[f.get('path') for f in files]}")
            return None
        dl_resp = await http.get(pdf_file["url"])
        dl_resp.raise_for_status()
        return dl_resp.content


async def start_gusto_w2_task() -> dict:
    """Start a browser-use task to fetch the W-2 from Gusto.

    If the profile has valid cookies, it goes straight to the dashboard.
    If login is needed, it logs in with stored credentials and waits for MFA.

    Returns immediately with {"live_url": str, "task_id": str, "session_id": str}.
    Poll with get_gusto_w2_result() for the PDF bytes.
    """
    client = _client()

    # Reuse existing gusto profile or create one
    profiles = await client.profiles.list()
    profile = next((p for p in profiles.items if p.name == "gusto"), None)
    if not profile:
        profile = await client.profiles.create(name="gusto")

    session = await client.sessions.create(profile_id=profile.id)

    task_run = client.run(
        task=(
            "Complete these steps in order:\n\n"
            "1. Go to https://app.gusto.com\n"
            "2. If you are already logged in and see the dashboard, skip to step 5.\n"
            "3. If you see a login page, enter the email and password from the "
            "provided secrets and click Sign In.\n"
            "4. If you see a two-factor authentication screen, wait for the user "
            "to enter the code manually. Keep checking every few seconds until "
            "you see the dashboard. Do NOT give up — this may take up to 2 minutes.\n"
            "5. On the Gusto dashboard, look for 'Recent Documents' or a similar section.\n"
            "6. Find the most recent W-2 form.\n"
            "7. Download the W-2 PDF. Look for a download icon (downward arrow) "
            "next to the document and click it to trigger a real file download. "
            "Do NOT just click the document name to view it in the browser.\n"
            "8. If the PDF opens in the browser viewer instead of downloading, "
            "use the download button in the PDF viewer toolbar to save the file.\n"
        ),
        session_id=str(session.id),
        secrets={"email": settings.gusto_email, "password": settings.gusto_password},
        max_steps=30,
    )

    # Get the task_id without waiting for completion
    task_id = await task_run._ensure_task_id()

    return {
        "live_url": session.live_url,
        "task_id": task_id,
        "session_id": str(session.id),
    }


async def get_gusto_w2_result(task_id: str, session_id: str) -> bytes:
    """Wait for the Gusto W-2 task to complete and return PDF bytes.

    Raises RuntimeError if the task failed or no file was downloaded.
    """
    client = _client()

    result = await client.tasks.wait(task_id, timeout=300)

    # Try output_files first (formal task output)
    if result.output_files:
        file_info = result.output_files[0]
        file_output = await client.files.task_output(task_id, str(file_info.id))
        async with httpx.AsyncClient() as http:
            resp = await http.get(file_output.download_url)
            resp.raise_for_status()
            return resp.content

    # Fallback: check session workspace for downloaded files
    logger.info(f"output_files empty, checking session {session_id} workspace...")
    pdf_bytes = await _fetch_session_file(session_id)
    if pdf_bytes:
        return pdf_bytes

    raise RuntimeError(
        f"No W-2 PDF was downloaded. Agent output: {result.output}"
    )
