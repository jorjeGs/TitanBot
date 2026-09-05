FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

# Dashboard dependencies and build
COPY dashboard/package*.json ./dashboard/
RUN cd dashboard && npm ci --include=dev

COPY . .

# Build Vite React SPA
RUN cd dashboard && npm run build

# Remove dashboard node_modules to keep final image lean
RUN rm -rf dashboard/node_modules

ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]
