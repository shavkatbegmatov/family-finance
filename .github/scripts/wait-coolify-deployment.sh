#!/usr/bin/env bash
# Coolify deployment'i tugashini kutadi (CI "Verify Deploy" job'i uchun).
#
# Sabab: Coolify webhook'i deployment'ni faqat NAVBATGA qo'yadi va darhol qaytadi.
# Konteyner almashinuvi (image pull + start + healthcheck) 1-3 daqiqa davom etadi va
# shu vaqtda ESKI konteyner hali 200 qaytarib turadi — oddiy HTTP tekshiruv yangi
# versiyani emas, eskisini "tasdiqlab" yuboradi (2026-09-02 da kuzatildi).
# Bu skript Coolify API'dan deployment holatini so'rab, `finished` bo'lguncha kutadi.
#
# Foydalanish:
#   wait-coolify-deployment.sh <webhook-url> <api-token> <deployment-uuid> [timeout-soniya]
#
# Chiqish kodlari:
#   0 — deployment `finished`
#   1 — deployment `failed`/`cancelled-by-user` yoki timeout
#   2 — holatni kuzatib BO'LMAYDI (uuid yo'q, token `read` huquqisiz, URL formati
#       kutilmagan) — chaqiruvchi vaqtga asoslangan kutishga o'tishi kerak
set -euo pipefail

readonly WEBHOOK_URL="${1:?webhook-url kerak}"
readonly API_TOKEN="${2:?api-token kerak}"
readonly DEPLOYMENT_UUID="${3:-}"
readonly TIMEOUT_SECONDS="${4:-900}"
readonly POLL_INTERVAL_SECONDS=15
readonly EXIT_CANNOT_OBSERVE=2

if [ -z "$DEPLOYMENT_UUID" ]; then
  echo "::warning::deployment_uuid kelmadi — Coolify holatini kuzatib bo'lmaydi"
  exit "$EXIT_CANNOT_OBSERVE"
fi

# Webhook: https://<coolify-host>/api/v1/deploy?uuid=...  →  base: https://<coolify-host>
base_url="${WEBHOOK_URL%%/api/v1/deploy*}"
if [ "$base_url" = "$WEBHOOK_URL" ]; then
  echo "::warning::Webhook URL formati kutilmagan (/api/v1/deploy topilmadi) — holat kuzatilmaydi"
  exit "$EXIT_CANNOT_OBSERVE"
fi
# Repo public → Actions log'i ham public. Coolify host'i log'ga tushmasin.
echo "::add-mask::$base_url"
readonly STATUS_URL="$base_url/api/v1/deployments/$DEPLOYMENT_UUID"

response_file="$(mktemp)"
trap 'rm -f "$response_file"' EXIT

deadline=$(( $(date +%s) + TIMEOUT_SECONDS ))
status=""
while :; do
  http_code="$(curl -s -o "$response_file" -w '%{http_code}' --max-time 20 \
    -H "Authorization: Bearer $API_TOKEN" "$STATUS_URL" || echo 000)"

  case "$http_code" in
    200)
      status="$(jq -r '.status // empty' "$response_file" 2>/dev/null || true)"
      ;;
    401|403)
      echo "::warning::Coolify API token'ida 'read' huquqi yo'q (HTTP $http_code) — deployment holati kuzatilmaydi"
      exit "$EXIT_CANNOT_OBSERVE"
      ;;
    *)
      echo "Coolify holat so'rovi HTTP $http_code — qayta urinaman"
      status=""
      ;;
  esac

  echo "deployment $DEPLOYMENT_UUID: status=${status:-?}"
  case "$status" in
    finished)
      exit 0
      ;;
    failed|cancelled-by-user)
      echo "::error::Coolify deployment $DEPLOYMENT_UUID holati: $status"
      exit 1
      ;;
  esac

  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "::error::Coolify deployment $DEPLOYMENT_UUID ${TIMEOUT_SECONDS}s ichida tugamadi (oxirgi holat: ${status:-?})"
    exit 1
  fi
  sleep "$POLL_INTERVAL_SECONDS"
done
