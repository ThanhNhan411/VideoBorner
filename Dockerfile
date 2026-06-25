FROM node:22-bookworm

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN npx playwright install --with-deps chromium

COPY . .
RUN npm run build

ENV PORT=3000
ENV NODE_OPTIONS=--max-old-space-size=256
EXPOSE 3000 5173

CMD ["npm", "run", "server"]
