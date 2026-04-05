# Используем легковесный образ Python
FROM python:3.11-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Запрещаем Python писать файлы .pyc на диск и включаем буферизацию логов (важно для Docker)
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Устанавливаем системные зависимости (если нужны для библиотек типа psycopg2 или др.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Копируем файл зависимостей
COPY requirements.txt .

# Устанавливаем зависимости
RUN pip install --no-cache-dir -r requirements.txt

# Копируем весь код проекта
COPY . .

# Открываем порт (FastAPI обычно на 8000)
EXPOSE 8000

# Команда для запуска приложения
# Замени src.main:app на путь к твоему FastAPI объекту
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]