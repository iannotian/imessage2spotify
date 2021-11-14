FROM postgres:13-alpine
WORKDIR /
EXPOSE 5432
COPY ./database/seed/init.sql /docker-entrypoint-initdb.d/
COPY ./database/seed/*.csv /seed/