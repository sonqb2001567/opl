# syntax=docker/dockerfile:1

# =====================================================================
# Stage 1 - BUILD: cài full package, sinh Prisma Client, compile TS
# =====================================================================
# Dùng Debian slim cho cả 2 stage. Toàn bộ dependency hiện tại đều là
# JavaScript thuần (pg, bcryptjs, multer...) nên không cần toolchain
# biên dịch native module.
FROM node:24-slim AS builder

WORKDIR /app

# Copy manifest trước để Docker cache được bước npm ci
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# src/generated/prisma nằm trong .gitignore nên không có trong source.
# Bắt buộc sinh lại, nếu thiếu server sẽ lỗi:
#   Cannot find module './generated/prisma/client.js'
# App dùng driver adapter Postgres nên bước này KHÔNG cần kết nối database.
RUN npx prisma generate

RUN npm run build

# Bỏ devDependencies để node_modules copy sang stage runtime gọn hơn
RUN npm prune --omit=dev

# =====================================================================
# Stage 2 - RUNTIME: chỉ còn dist + dependencies production
# =====================================================================
# Phải cùng base (node:24-slim) với stage build để node_modules copy sang
# chạy được nguyên trạng.
FROM node:24-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# main.ts tự tạo ./uploads khi start, nhưng tạo sẵn ở đây để Docker volume
# mount vào đúng quyền của user `node`
RUN mkdir -p uploads && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "dist/main.js"]
