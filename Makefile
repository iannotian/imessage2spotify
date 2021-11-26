start:
	docker compose up -d

build:
	docker compose up -d --build

stop:
	docker compose stop

clean:
	docker compose down -v --rmi local