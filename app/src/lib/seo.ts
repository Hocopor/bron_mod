// Минимальный хелпер alt-текста для фото номеров.
// (JsonLd/локалити/SEO-страницы из донора не переносятся — трафик идёт с Tilda.)

export function buildRoomImageAlt(roomName: string, index = 0): string {
  const base = roomName?.trim() || 'Номер'
  return index === 0 ? `${base} — фото` : `${base} — фото ${index + 1}`
}
