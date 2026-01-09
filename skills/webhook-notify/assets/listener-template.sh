#!/bin/bash
# Webhook Notification Listener
# Subscribes to ntfy.sh and displays desktop notifications

NTFY_TOPIC="{{NTFY_TOPIC}}"
WEBHOOK_NAME="{{WEBHOOK_NAME}}"
SOUND_FILE="{{SOUND_FILE}}"
FALLBACK_SOUND="/System/Library/Sounds/Glass.aiff"
LOG_FILE="{{LOG_FILE}}"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" >> "$LOG_FILE"
}

# Determine sound to play
if [[ -f "$SOUND_FILE" ]]; then
    PLAY_SOUND="$SOUND_FILE"
else
    PLAY_SOUND="$FALLBACK_SOUND"
fi

log "Listener started for $WEBHOOK_NAME"
log "Topic: ntfy.sh/$NTFY_TOPIC"
log "Sound: $PLAY_SOUND"

# Subscribe to ntfy.sh and process messages
curl -s "https://ntfy.sh/$NTFY_TOPIC/raw" --no-buffer | while read -r message; do
    # Skip empty messages (keepalives from ntfy)
    [[ -z "$message" ]] && continue

    log "Notification received: $message"

    # Play notification sound
    afplay "$PLAY_SOUND" &

    # Parse message (could be plain text or JSON)
    title=$(echo "$message" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('title','$WEBHOOK_NAME'))" 2>/dev/null || echo "$WEBHOOK_NAME")
    body=$(echo "$message" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',''))" 2>/dev/null || echo "$message")
    url=$(echo "$message" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('url',''))" 2>/dev/null || echo "")

    # Show desktop notification
    if [[ -n "$url" ]]; then
        terminal-notifier -title "$title" -message "$body" -open "$url"
    else
        terminal-notifier -title "$title" -message "$body"
    fi
done

log "Listener stopped"
