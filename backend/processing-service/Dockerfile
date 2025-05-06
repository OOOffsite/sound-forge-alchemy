FROM pytorch/pytorch:2.1.2-cuda12.1-cudnn8-runtime

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y ffmpeg curl software-properties-common && \
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs gcc g++ && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Demucs and other Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Node.js dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy application code
COPY . .

# Create directories
RUN mkdir -p /app/audio_data

EXPOSE 3003

CMD ["npm", "start"]