import type { Locale } from "@/lib/locales";
const en = {
  title: "Result corrections",
  help: "Propose a completed singles result, review affected matches, then apply. Original results and saved K remain in history.",
  propose: "Review correction",
  apply: "Apply reviewed correction",
  reason: "Reason",
  played: "Played",
  withdrawal: "Automatic loss",
  winner: "Winner",
  server: "First server",
  sets: "Set points (A / B)",
  review: "Correction review",
  confirm: "I reviewed the proposed result and its effects.",
  resolve:
    "As Organizer, I approve invalidating the listed started play and creating fresh dependent matches.",
  blocked:
    "An Organizer must resolve started play before applying this correction.",
  stale:
    "This review is stale. Return to the match and prepare a new proposal.",
  failed:
    "Correction failed. Refresh and check the result, score, reason and current review.",
  applied:
    "Correction applied. Ratings and dependent matches were updated together.",
  empty: "No completed singles results are available for correction.",
  history:
    "Affected match attempts are retained; replacements require fresh lineups.",
  pending:
    "The team match needs more singles and must be assigned and resumed in hall control.",
  back: "Match lineups",
  savedK: "Original K",
  affected: "Affected matches",
  trailing: "Later singles made ineffective",
  team: "Proposed team singles",
  appliedTitle: "Applied correction",
  reopen: "Reopen team forfeit for play",
  reopenHelp:
    "Preserve the forfeit and create a fresh match requiring new lineups. Review affected matches before applying.",
  forfeit: "Correct team-forfeit winner",
  forfeitHelp:
    "Record the correct automatic 3–0 winner without creating singles or Elo results.",
  freshMatch: "Open fresh match lineups",
};
const ru: typeof en = {
  title: "Исправление результатов",
  help: "Предложите результат завершённой одиночной встречи, проверьте последствия и примените. Исходные результаты и K сохраняются.",
  propose: "Проверить исправление",
  apply: "Применить исправление",
  reason: "Причина",
  played: "Сыграно",
  withdrawal: "Техническое поражение",
  winner: "Победитель",
  server: "Первая подача",
  sets: "Очки по партиям (A / B)",
  review: "Проверка исправления",
  confirm: "Я проверил результат и последствия исправления.",
  resolve:
    "Как организатор, разрешаю аннулировать указанные начатые встречи и создать новые зависимые матчи.",
  blocked: "Начатые встречи должен разрешить организатор.",
  stale: "Проверка устарела. Вернитесь к матчу и создайте новое предложение.",
  failed:
    "Не удалось исправить. Обновите страницу и проверьте результат, счёт и причину.",
  applied:
    "Исправление применено. Рейтинги и зависимые матчи обновлены вместе.",
  empty: "Нет завершённых одиночных встреч для исправления.",
  history: "Предыдущие матчи сохраняются; для новых нужны новые составы.",
  pending:
    "Нужны дополнительные одиночные встречи. Назначьте стол и возобновите матч в управлении залом.",
  back: "Составы матча",
  savedK: "Исходный K",
  affected: "Зависимые матчи",
  trailing: "Последующие одиночные встречи, утратившие силу",
  team: "Предлагаемый счёт матча",
  appliedTitle: "Исправление применено",
  reopen: "Возобновить матч после технического поражения",
  reopenHelp:
    "Исходный результат сохраняется. Новый матч требует новых составов. Перед применением проверьте зависимые матчи.",
  forfeit: "Исправить победителя технического матча",
  forfeitHelp:
    "Укажите победителя со счётом 3–0 без создания одиночных результатов и изменений Elo.",
  freshMatch: "Открыть составы нового матча",
};
const kk: typeof en = {
  title: "Нәтижелерді түзету",
  help: "Аяқталған жеке ойынның нәтижесін ұсыныңыз, салдарын тексеріп, қолданыңыз. Бастапқы нәтиже мен K сақталады.",
  propose: "Түзетуді тексеру",
  apply: "Түзетуді қолдану",
  reason: "Себеп",
  played: "Ойналды",
  withdrawal: "Техникалық жеңіліс",
  winner: "Жеңімпаз",
  server: "Алғашқы доп беру",
  sets: "Партия ұпайлары (A / B)",
  review: "Түзетуді тексеру",
  confirm: "Нәтиже мен түзету салдарын тексердім.",
  resolve:
    "Ұйымдастырушы ретінде көрсетілген басталған ойындарды жойып, жаңа тәуелді матчтарды құруға келісемін.",
  blocked: "Басталған ойындарды ұйымдастырушы шешуі керек.",
  stale: "Тексеру ескірді. Матчқа оралып, жаңа ұсыныс жасаңыз.",
  failed:
    "Түзету орындалмады. Бетті жаңартып, нәтиже, есеп пен себепті тексеріңіз.",
  applied:
    "Түзету қолданылды. Рейтингтер мен тәуелді матчтар бірге жаңартылды.",
  empty: "Түзетуге болатын аяқталған жеке ойындар жоқ.",
  history: "Алдыңғы матчтар сақталады; жаңаларына жаңа құрамдар қажет.",
  pending:
    "Қосымша жеке ойындар қажет. Залды басқаруда үстел тағайындап, матчты жалғастырыңыз.",
  back: "Матч құрамдары",
  savedK: "Бастапқы K",
  affected: "Тәуелді матчтар",
  trailing: "Күшін жоятын кейінгі жеке ойындар",
  team: "Ұсынылған матч есебі",
  appliedTitle: "Түзету қолданылды",
  reopen: "Техникалық жеңілістен кейін матчты қайта ашу",
  reopenHelp:
    "Бастапқы нәтиже сақталады. Жаңа матчқа жаңа құрамдар қажет. Қолданар алдында тәуелді матчтарды тексеріңіз.",
  forfeit: "Техникалық матч жеңімпазын түзету",
  forfeitHelp:
    "Жеке ойын нәтижелері мен Elo өзгерістерінсіз 3–0 жеңімпазын көрсетіңіз.",
  freshMatch: "Жаңа матч құрамдарын ашу",
};
export const correctionMessages = (locale: Locale) => ({ en, ru, kk })[locale];
