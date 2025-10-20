FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 초기 빌드용 더미 복사 (볼륨 마운트로 런타임에 덮임)
COPY app ./app

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host","0.0.0.0","--port","8000","--reload"]
