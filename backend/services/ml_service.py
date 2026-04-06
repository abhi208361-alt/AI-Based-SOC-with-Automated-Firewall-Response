from ai_model import get_ai_pipeline


class MLService:
    @staticmethod
    def predict(payload: dict) -> dict:
        pipeline = get_ai_pipeline()
        return pipeline.predict(payload)