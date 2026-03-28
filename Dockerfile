# Estágio 1: Build e Instalação
FROM node:18-alpine AS builder
WORKDIR /app

# Copia apenas os arquivos de dependências primeiro (otimiza cache de camadas)
COPY package*.json ./

# Instala apenas o necessário e limpa o cache do npm imediatamente
RUN npm install --omit=dev && npm cache clean --force

# Estágio 2: Produção (Imagem Final)
FROM node:18-alpine
WORKDIR /app

# Copia apenas os arquivos necessários do estágio anterior
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Segurança: Não rodar como root
USER node

EXPOSE 3000
CMD ["npm", "start"]
