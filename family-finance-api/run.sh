#!/bin/bash
# .env fayldan environment variable'larni yuklash
set -a
source .env
set +a

./mvnw.cmd spring-boot:run
