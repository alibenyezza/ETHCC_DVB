#!/bin/bash
# Usage: ./cctp-attestation.sh <message_hash> <destination_rpc> <bridge_address>
#
# Polls Circle's attestation API for a CCTP message, then calls bridgeIn()
# on the destination chain to complete the transfer.
#
# Example (Arc -> Base Sepolia):
#   ./cctp-attestation.sh 0xabcdef123... https://sepolia.base.org 0xBridgeAddress

MESSAGE_HASH=$1
DEST_RPC=$2
BRIDGE_ADDRESS=$3

if [ -z "$MESSAGE_HASH" ] || [ -z "$DEST_RPC" ] || [ -z "$BRIDGE_ADDRESS" ]; then
  echo "Usage: $0 <message_hash> <destination_rpc> <bridge_address>"
  exit 1
fi

ATTESTATION_API="https://iris-api-sandbox.circle.com/v2/attestations/${MESSAGE_HASH}"

echo "Polling attestation for message: ${MESSAGE_HASH}"
echo "API: ${ATTESTATION_API}"

while true; do
  RESPONSE=$(curl -s "$ATTESTATION_API")
  STATUS=$(echo "$RESPONSE" | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)

  if [ "$STATUS" = "complete" ]; then
    echo "Attestation received!"

    MESSAGE=$(echo "$RESPONSE" | grep -o '"message":"[^"]*"' | head -1 | cut -d'"' -f4)
    ATTESTATION=$(echo "$RESPONSE" | grep -o '"attestation":"[^"]*"' | head -1 | cut -d'"' -f4)

    echo "Message: ${MESSAGE}"
    echo "Attestation: ${ATTESTATION}"

    echo "Calling bridgeIn on ${BRIDGE_ADDRESS}..."
    cast send "$BRIDGE_ADDRESS" \
      "bridgeIn(bytes,bytes)" \
      "$MESSAGE" "$ATTESTATION" \
      --rpc-url "$DEST_RPC" \
      --private-key "$PRIVATE_KEY"

    echo "Done!"
    exit 0
  else
    echo "Status: ${STATUS:-pending} — waiting 10s..."
    sleep 10
  fi
done
