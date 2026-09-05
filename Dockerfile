FROM node:20-alpine

WORKDIR /usr/src/app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

# Dashboard dependencies and build
COPY dashboard/package*.json ./dashboard/
RUN cd dashboard && npm ci

COPY . .

# Build Vite React SPA
RUN cd dashboard && npm run build

EXPOSE 3000

CMD ["npm", "start"]
