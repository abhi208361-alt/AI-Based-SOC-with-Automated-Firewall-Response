FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Remove lock file and node_modules to force clean install
RUN rm -rf package-lock.json node_modules && npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]