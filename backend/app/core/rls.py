from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def set_tenant_context(session: AsyncSession, user_id: str, tenant_id: str):
    await session.execute(text(f"SET LOCAL app.current_user_id = '{user_id}'"))
    await session.execute(text(f"SET LOCAL app.current_tenant_id = '{tenant_id}'"))
