FROM node:20-bookworm-slim

# Install Python and build tools for native dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
