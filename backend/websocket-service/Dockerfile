FROM node-base

WORKDIR /app

# Copy application code and dependencies
COPY package.json package-lock.json ./
RUN npm install
COPY . .

EXPOSE 3006

CMD ["npm", "start"]