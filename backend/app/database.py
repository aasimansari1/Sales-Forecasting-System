from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

_engine = None
_session_factory = None


def _fix_db_url(url: str) -> str:
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


def _get_engine():
    global _engine, _session_factory
    if _engine is None:
        _engine = create_async_engine(
            _fix_db_url(settings.DATABASE_URL),
            echo=False,
            pool_size=5,
            max_overflow=10,
            connect_args={"timeout": 10},
        )
        _session_factory = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)
    return _engine


class Base(DeclarativeBase):
    pass


def AsyncSessionLocal():
    if _session_factory is None:
        _get_engine()
    return _session_factory()


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def create_tables():
    engine = _get_engine()
    async with engine.begin() as conn:
        from app.models import user, sales, forecast  # noqa
        await conn.run_sync(Base.metadata.create_all)
