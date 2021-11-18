FROM node:16.12-alpine
WORKDIR /app/
COPY . .
RUN npm install
EXPOSE 8080
CMD ["npm", "run", "start:dev"]