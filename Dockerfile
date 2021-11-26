FROM node:16.12-alpine
WORKDIR /app/
COPY /package.json /package-lock.json /tsconfig.json ./
COPY /src ./src
RUN npm install
EXPOSE 8080
CMD ["npm", "run", "start:dev"]