import logging
import httpx
try:
    from browser_use_sdk import AsyncBrowserUse
except ImportError:
    AsyncBrowserUse = None  # type: ignore

from app.config import settings
from app.services.gusto_agent import _fetch_session_file

logger = logging.getLogger("uvicorn")


def _client() -> AsyncBrowserUse:
    return AsyncBrowserUse(api_key=settings.browser_use_api_key)


async def start_fidelity_1099_task() -> dict:
    """Start a browser-use task to fetch the consolidated 1099 from Fidelity.

    If the profile has valid cookies, it goes straight to the dashboard.
    If login is needed, it logs in with stored credentials and waits for MFA.

    Returns immediately with {"live_url": str, "task_id": str, "session_id": str}.
    Poll with get_fidelity_1099_result() for the PDF bytes.
    """
    client = _client()

    # Reuse existing fidelity profile or create one
    profiles = await client.profiles.list()
    profile = next((p for p in profiles.items if p.name == "fidelity"), None)
    if not profile:
        profile = await client.profiles.create(name="fidelity")

    session = await client.sessions.create(profile_id=profile.id)

    task_run = client.run(
        task=(
            "Complete these steps in order:\n\n"
            "1. Go to https://digital.fidelity.com/ftgw/digital/tax-forms\n"
            "2. If you see a login page, enter the username and password from the "
            "provided secrets and click Log In.\n"
            "3. If you see a two-factor authentication or security code screen, wait for "
            "the user to enter the code manually. Keep checking every few seconds until "
            "the page loads. Do NOT give up — this may take up to 2 minutes.\n"
            "4. You should now see the Tax Forms page. Find the 2025 Consolidated "
            "Form 1099.\n"
            "5. Click the download link/button for the 1099 PDF to trigger a file "
            "download. Make sure to click a link that directly downloads the PDF "
            "file, not one that opens a viewer.\n"
            "6. If the PDF opens in the browser viewer instead of downloading, "
            "use the download button in the PDF viewer toolbar to save the file.\n"
        ),
        session_id=str(session.id),
        secrets={"email": settings.fidelity_email, "password": settings.fidelity_password},
        max_steps=30,
    )

    # Get the task_id without waiting for completion
    task_id = await task_run._ensure_task_id()

    return {
        "live_url": session.live_url,
        "task_id": task_id,
        "session_id": str(session.id),
    }


async def get_fidelity_1099_result(task_id: str, session_id: str) -> bytes:
    """Wait for the Fidelity 1099 task to complete and return PDF bytes.

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
        f"No 1099 PDF was downloaded. Agent output: {result.output}"
    )
