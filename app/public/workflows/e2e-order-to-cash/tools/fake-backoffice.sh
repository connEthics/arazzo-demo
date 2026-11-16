#!/usr/bin/env bash
# Faux back-office pour les tests E2E : publie `order.confirmed` sur Kafka.
# Envoie un message « bruit » (ord_999) puis le bon (ord_123) chaque seconde, pendant N secondes,
# pour vérifier que l'étape Arazzo filtre bien par correlationId.
#
# Usage : tools/fake-backoffice.sh [conteneur-kafka] [durée-en-secondes]
set -euo pipefail
KAFKA_CONTAINER="${1:-kafka}"
DURATION="${2:-20}"
for _ in $(seq 1 "$DURATION"); do
  echo '{"orderId":"ord_999","status":"confirmed","warehouseId":"wh_lille_02","confirmedAt":"2026-11-16T16:00:01Z"}'
  echo '{"orderId":"ord_123","status":"confirmed","warehouseId":"wh_lyon_01","confirmedAt":"2026-11-16T16:00:02Z"}'
  sleep 1
done | docker exec -i "$KAFKA_CONTAINER" /opt/kafka/bin/kafka-console-producer.sh \
  --bootstrap-server 127.0.0.1:9092 --topic order.confirmed
