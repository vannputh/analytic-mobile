let pendingMediaFlashMessage: string | null = null

export function setPendingMediaFlashMessage(message: string | null) {
  pendingMediaFlashMessage = message
}

export function consumePendingMediaFlashMessage() {
  const next = pendingMediaFlashMessage
  pendingMediaFlashMessage = null
  return next
}
