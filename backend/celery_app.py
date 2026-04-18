from celery import Celery
from core.config import settings

celery = Celery("soc_worker", broker=settings.REDIS_URL, backend=settings.REDIS_URL)
celery.conf.task_track_started = True
celery.conf.result_expires = 3600