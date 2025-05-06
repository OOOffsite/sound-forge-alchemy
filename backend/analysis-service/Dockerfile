FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y ffmpeg curl gcc libasound2-dev libsndfile1 && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Node.js dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy application code
COPY . .

# Create directories
RUN mkdir -p /app/audio_data

EXPOSE 3004

CMD ["npm", "start"]