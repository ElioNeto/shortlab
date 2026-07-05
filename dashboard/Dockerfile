# Build stage
FROM node:18-alpine AS builder

ARG VITE_API_URL

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci --ignore-scripts

COPY . .

RUN VITE_API_URL=${VITE_API_URL} npm run build

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
