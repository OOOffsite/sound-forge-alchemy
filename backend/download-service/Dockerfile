FROM python-node-base

WORKDIR /app

# Copy application code and dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# Create directories
RUN mkdir -p /app/audio_data

EXPOSE 3002

CMD ["npm", "start"]