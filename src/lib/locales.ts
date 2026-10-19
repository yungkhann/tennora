export const locales = ["ru", "kk", "en"] as const;
export type Locale = (typeof locales)[number];
export function localeOf(value: unknown): Locale {
  return value === "kk" || value === "en" ? value : "ru";
}
const en = {
  lineupConflict:
    "A transfer left the same player on both sides. An official can choose an eligible reserve before the match starts.",

  swapSeeds: "Swap seed positions",
  seedA: "First seed position",
  seedB: "Second seed position",
  swapHelp:
    "Swap two positions using the frozen players and ratings. Earlier drafts remain in history. Confirm the action before publishing.",
  swapConfirm: "I reviewed both clubs and confirm this seed swap.",
  swapInvalid:
    "Seed swap failed. Refresh and check distinct seed positions, confirmation, current draft version and publication status.",
  seedAdjustment: "Manual seed adjustment",
  chooseSeed: "Choose a seed",

  groupStandings: "Group standings",
  refreshStandings: "Refresh standings",
  drawTies: "Draw unresolved ties",
  tieDrawConfirm:
    "I confirm the audited random draw for the remaining tied clubs. This draw cannot be repeated to choose a preferred outcome.",
  standingsInvalid:
    "Refresh the page and check that the group is complete and the standings version is current.",
  dependencyBlocked:
    "A dependent match is locked or has started. An Organizer must resolve the correction before qualifiers can change.",
  standingsEmpty:
    "Standings have not been calculated yet. Refresh to show the current results.",
  standingsProvisional:
    "Provisional: group matches are still incomplete. No qualifiers advance.",
  standingsTied:
    "Group complete. An Organizer draw is required to resolve the remaining tie.",
  standingsFinal: "Group finalized. Qualifiers advance from this snapshot.",
  standingPlayed: "Played",
  standingWins: "Wins",
  standingLosses: "Losses",
  standingGames: "Singles",
  standingSets: "Sets",
  standingPoints: "Points",
  tieEvidence: "Tie-break evidence",
  tieWins: "Mini-table wins",
  tieGames: "Singles ratio",
  tieSets: "Set ratio",
  tiePoints: "Point ratio",
  tieLot: "Audited random draw",
  tieUnresolved: "Unresolved",
  sourcesPending:
    "Upstream results are not finalized. Lineups are unavailable until qualifier sources are ready.",

  lineupIntro:
    "Submit five eligible players for your team. Both lineups remain hidden until both sides submit.",
  manageLineup: "Match lineups",
  noMatches: "No published matches in your scope yet.",
  pagination: "Pages",
  previousPage: "Previous page",
  nextPage: "Next page",
  submitLineup: "Submit and lock lineup",
  lineupConfirm:
    "I confirm five distinct players in the required gender order. Submission locks this lineup. Only an official may replace a player before their singles starts.",
  slot: "Slot",
  lineupInvalid:
    "Check all five distinct players, their gender order and current season-roster eligibility. A submitted lineup is locked.",
  replacePlayer: "Replace locked player",
  replacementPlayer: "Replacement player",
  replacementInvalid:
    "Replacement failed. Refresh the lineup and check the player, slot, confirmation and that this singles has not started.",
  replacementHelp:
    "Only a distinct eligible roster player of the same gender may replace a pending singles player. Original submission and replacement history are retained.",
  noReplacement:
    "No unused eligible reserve or pending singles slot is available.",
  lineupsRevealed: "Both lineups are revealed.",
  lineupsHidden:
    "Player selections stay hidden until both teams submit. Officials see submission status only.",
  lineupSubmitted: "Lineup submitted and locked",
  lineupNotSubmitted: "Lineup not submitted",
  hiddenPlayers: "Players hidden until joint reveal.",
  waitingForReveal:
    "Waiting for the other lineup. The submitted lineup is locked.",
  replacementHistory: "Replacement history",
  lineupUpdates: "Lineup updates connected.",
  lineupUpdatesStale:
    "Updates unavailable. Reconnecting; refresh before submitting changes.",
  lineupUpdatesChecking: "Checking lineup updates…",
  scheduled: "Scheduled",
  called: "Called to table",
  in_progress: "In progress",
  finished: "Finished",
  cancelled: "Cancelled",
  draws: "Draws",
  drawIntro:
    "Freeze seed ratings, review groups and match dependencies, then publish. A published draw cannot be regenerated.",
  generateDraw: "Generate draw",
  regenerateDraw: "Regenerate draft draw",
  publishDraw: "Publish draw",
  drawPublished: "Published",
  publishedDrawLocked:
    "The published draw is locked. Public pages follow in the public-site task.",
  noDraw: "No draw generated yet.",
  drawSeasonRequired:
    "Start the fully configured season before generating its draws.",
  seedFreezeConfirm:
    "Freeze the top three eligible boys and top two eligible girls per club at their current ratings. Equal team totals use a recorded random draw. Regeneration preserves earlier draft history.",
  publishDrawConfirm:
    "I have reviewed the groups and match graph. Publish this revision and lock regeneration.",
  drawInvalid:
    "Could not change the draw. Check confirmation, season state and latest revision, then refresh.",
  seedRosterRequired:
    "Every club needs at least three active eligible boys and two active eligible girls on its season roster before this draw can be seeded.",
  drawUnsupported:
    "This stage format needs a supported draw map. Available maps: the confirmed four-group, three-bracket format; standalone round-robin groups; and seeded knockout sizes 2, 4, 8, 16 or 32.",
  drawGroups: "Draw groups and brackets",
  frozenSeeds: "Frozen seeds",
  frozenRating: "Frozen team rating",
  seedingPlayers: "Seeding players and frozen ratings",
  matchGraph: "Match graph",
  matchGraphHelp:
    "Participants follow finalized source results. Open a ready match to manage lineups.",
  group: "Group",
  match: "Match",
  matches: "Matches",
  round: "Round",
  winner: "Winner",
  loser: "Loser",
  bracketPlaces: "Bracket places",
  toBeDetermined: "To be determined",
  configureTournament: "Configure tournament",
  configurationIntro:
    "Configure settings and stage plans before starting the season. Previous revisions are retained.",
  kFactor: "Elo K-factor",
  changeK: "Change K for future results",
  saveSettings: "Save tournament settings",
  settingsInvalid:
    "Check settings or refresh to load the latest revision. K must be positive.",
  settingsHelp:
    "Each save preserves a version. After season start only K can change, affecting future calculations; earlier results retain their K.",
  tableCount: "Number of tables",
  restMinutes: "Minimum rest (minutes)",
  finalsPriority: "Finals priority",
  finalsFirst: "Finals first after required rest",
  normalOrder: "Normal match order",
  venueTimezone: "Venue timezone",
  newTemplate: "Create stage template",
  template: "Stage template",
  stageFormat: "Format",
  composite: "Groups followed by knockout brackets",
  roundRobin: "Round-robin groups",
  knockout: "Knockout bracket",
  groupCount: "Number of groups",
  groupSize: "Clubs per group",
  bracketCount: "Number of knockout brackets",
  knockoutSize: "Entries in knockout bracket",
  groupPlaces: "Group places",
  entries: "Entries",
  revision: "Version",
  applyTemplate: "Apply template",
  templateHelp:
    "For a composite, consecutive group places are divided equally between brackets. Each bracket must have a power-of-two entry count. Defaults: four groups of six, then three brackets of eight (places 1–2, 3–4, 5–6). Templates are immutable; create a new one to change the format.",
  templateInvalid:
    "Check the format. Placement bands must cover every group place once and produce valid knockout sizes.",
  stagePlans: "Stage plans",
  noStagePlan: "Stage plan not configured.",
  stagePlanHelp:
    "Apply a reusable template to the selected age groups. Replacing a draft plan preserves its earlier stages.",
  stagePlanInvalid:
    "Select a template and at least one age group. The season must still be a draft.",
  planHistory: "Stage plan history",
  drawsPending:
    "Stage plans define qualification bands. Open Draws to review frozen seeds and match paths. Standings and advancement follow in later tasks.",
  tournamentSettings: "Tournament settings",
  settingsHistory: "Settings history",
  startSeason: "Start season",
  startConfirm:
    "I confirm the season configuration. Starting freezes dates, registrations and stage plans; only prospective K changes remain available.",
  notReady: "Complete the readiness checklist before starting.",
  ready: "Ready to start",
  unsupported_final_groups:
    "Multiple final groups need knockout classification stages. A single final round-robin group is also supported.",
  no_tours: "Add at least one tournament.",
  missing_settings: "Configure settings for every tournament.",
  missing_stage_plans: "Configure all three age groups in every tournament.",
  entry_count_mismatch:
    "Registered clubs must match every stage plan’s entry count.",
  registeredClubs: "Registered clubs",
  photos: "Photos and consent",
  uploadPhoto: "Upload photo for review",
  photoFile: "Player photo (JPEG, PNG or WebP; max 2 MiB)",
  consentEvidence: "Written guardian consent (PDF or image; max 2 MiB)",
  guardianPermission:
    "I confirm written guardian permission to publish this player’s photo.",
  photoHelp:
    "Originals and consent evidence stay private. Only an Organizer can approve publication. To retry an interrupted upload, select the same files.",
  photoInvalid:
    "Check the files and written-permission confirmation. Use supported formats within the size and pixel limits.",
  photoUploadFailed:
    "Upload is incomplete. Retry with the same files; contact the operator if private Storage is unavailable.",
  photoUploaded: "Uploaded privately. Awaiting Organizer review.",
  savePhotoReview: "Save publication decision",
  reviewDecision: "Publication decision",
  approvePhoto: "Approve publication",
  rejectPhoto: "Reject upload",
  revokePhoto: "Revoke publication",
  reviewPhotoHelp:
    "Review the photo and written consent before approving. Revocation immediately removes the public projection; originals and audit history are retained.",
  photoPendingUpload: "Upload incomplete",
  photoPendingReview: "Awaiting review",
  photoApproved: "Publication approved",
  photoRejected: "Upload rejected",
  photoRevoked: "Publication revoked",
  viewPrivatePhoto: "View private original",
  downloadConsent: "Download consent evidence",
  viewPublicPhoto: "View approved public photo",
  noPhotos: "No photos uploaded.",

  teams: "Clubs",
  region: "Region",
  newTeam: "Create club",
  noTeams: "No assigned clubs yet.",
  teamsIntro:
    "Manage clubs, their age-group subteams and players within your assigned scope.",
  choose: "Select",
  registerTeam: "Register club in season",
  assignTrainer: "Assign trainer",
  subteams: "Age-group subteams",
  trainerScopeHelp:
    "The Trainer will coach these subteams within this club. Assigning another club replaces their previous club assignment.",
  players: "Players",
  newPlayer: "Create player",
  firstName: "First name",
  lastName: "Last name",
  gender: "Gender",
  boy: "Boy",
  girl: "Girl",
  dob: "Date of birth (private)",
  hand: "Playing hand",
  right: "Right",
  left: "Left",
  style: "Playing style",
  sportsLevel: "Sports level",
  externalId: "External rating ID (optional)",
  playerPrivacy:
    "Player records do not create login accounts. Date of birth stays private; new ratings start at 1000. Photos require written guardian consent and Organizer approval.",
  playerInvalid:
    "Check player details. Date of birth must preserve all active roster age groups.",
  addRoster: "Add to roster",
  rosterHelp:
    "Active players in this age group or younger may join. Maximum 10 per season roster. Tournaments use this active roster directly.",
  rosterInvalid:
    "Could not add player. Check registration, age, current club, active status and roster capacity.",
  removeRoster: "End roster membership",
  reason: "Reason",
  confirmAction: "I confirm this action",
  ageIneligible:
    "This player exceeds the lineup age limit for the season. Younger players may play in older categories.",
  dropPlayer: "Mark dropped out",
  effectiveDate: "Effective date",
  transferPlayer: "Approve transfer",
  receivingClub: "Receiving club",
  transferHelp:
    "This ends active roster memberships and moves the player to the receiving club. History is retained. The receiving club then selects an eligible season roster.",
  saveTrainerRef: "Save trainer reference",
  refKind: "Trainer reference type",
  firstTrainer: "First trainer",
  personalTrainer: "Personal trainer",
  linkedTrainer: "Linked trainer",
  freeTrainer: "Enter a trainer name below",
  trainerRefHelp:
    "Choose an existing trainer and leave the name fields empty, or enter both names without selecting a trainer.",
  trainerRefInvalid:
    "Choose a linked trainer or enter both first and last names, never both.",
  rating: "Rating",
  droppedOut: "Dropped out",
  editPlayer: "Edit player",
  trainerRefs: "Trainer references",
  noPlayers: "No players yet.",
  editTeam: "Edit club",
  registeredSeasons: "Registered seasons",
  trainers: "Trainers",
  roster: "Roster",
  registerFirst: "Register the club in a season before selecting its roster.",
  notAssigned: "You are not assigned to edit this subteam.",
  formerPlayer: "Former club player",
  ended: "Membership ended",
  rosterFull: "Roster capacity reached (10 active players).",
  noEligiblePlayers:
    "No eligible unselected players. Create a player in the club first.",

  refreshForms: "Refresh forms",
  seasons: "Seasons",
  tours: "Tournaments",
  seasonYear: "Season year for age eligibility",
  firstDay: "Start date",
  lastDay: "End date",
  ordinal: "Order",
  newSeason: "Create season",
  editSeason: "Edit season",
  newTour: "Add tournament",
  editTour: "Edit tournament",
  draft: "Draft",
  started: "Started",
  noTours: "No tournaments yet.",
  noSeasons: "No seasons yet.",
  configLocked: "Season configuration is locked.",
  ageRule:
    "Age on December 31: U13 under 13, U15 ages 13–14, U17 ages 15–16. Younger players may play in older categories.",
  seasonInvalid:
    "Check the season name, year and dates. Dates must contain all existing tournaments.",
  tourInvalid:
    "Check the tournament name, dates and order. Dates must fit the season and the order must be unique.",
  seasonsIntro:
    "Set the eligibility year and dates, then add the tournaments in order.",
  seasonReadiness:
    "Season start requires settings, stages for all age groups and matching club registrations.",

  league: "Table tennis league",
  workspace: "Workspace",
  staff: "Staff",
  profile: "Your profile",
  signOut: "Sign out",
  signIn: "Sign in",
  email: "Email address",
  password: "Password",
  confirmPassword: "Confirm password",
  name: "Name",
  roles: "Roles",
  organizer: "Organizer",
  main_judge: "Main Judge",
  trainer: "Trainer",
  line_judge: "Line Judge",
  active: "Active",
  inactive: "Inactive",
  save: "Save changes",
  create: "Create staff account",
  reset: "Reset password",
  recovery: "Forgot password?",
  sendReset: "Send reset link",
  back: "Back to sign in",
  accountsOnly:
    "Staff accounts are created by an Organizer. Contact your league Organizer for access.",
  staffDenied:
    "An active league staff account is required. Contact your Organizer.",
  failed:
    "The operation could not be completed. Check your details and try again.",
  saved: "Changes saved.",
  created:
    "Staff account created. Share the initial password securely with this person.",
  resetDone: "Password updated.",
  recoveryDone:
    "If an account exists for this email, you will receive a password reset link.",
  unavailable: "Authentication is not configured.",
  callbackError:
    "This link is invalid or has expired. Request a new reset link.",
  staffIntro: "Create staff accounts and manage their roles and access.",
  initialPassword: "Initial password (at least 12 characters)",
  jobs: "Account operations",
  retry: "Retry",
  pending: "Pending",
  complete: "Complete",
  failedJob: "Failed",
  noStaff: "No staff accounts.",
  noJobs: "No account operations yet.",
  coming:
    "Match, draw and hall tools will appear here as their implementation tasks are completed.",
  access: "Your access",
  selfProtection:
    "You cannot deactivate yourself or remove your own Organizer role.",
  changePassword: "Choose a new password",
  recoveryTitle: "Recover your account",
  jobConflict:
    "This email already has an account operation. Retry it below, or use the existing staff account.",
  working: "Saving…",
  minPassword: "Use 12–128 characters and matching passwords.",
  invalid: "Check the name, email and selected roles.",
  createHelp:
    "No invitation email is sent. The Organizer supplies an initial password; the person can change it after signing in. Retrying preserves the original initial password; reset it if unknown.",
  resetHelp:
    "Set a new password for this active staff member. Share it securely.",
  directory: "Staff directory",
  publicHome: "Public site",
  activate: "Account access",
  updated: "Updated",
  language: "Language",
  unavailableOperation:
    "Auth administration is not configured. Ask the operator to set the server secret.",
  savedAuthFailed:
    "Access saved in the database. Auth synchronization failed; save again to retry. Inactive accounts already have no league access.",
  resetHeading: "Set password",
  displayName: "Display name",
};
type Messages = typeof en;
const ru: Messages = {
  lineupConflict:
    "После перехода игрок указан с обеих сторон. Судья может выбрать допустимого запасного до начала матча.",

  swapSeeds: "Поменять позиции посева",
  seedA: "Первая позиция посева",
  seedB: "Вторая позиция посева",
  swapHelp:
    "Поменяйте две позиции с сохранением зафиксированных игроков и рейтингов. Предыдущие версии остаются в истории. Подтвердите действие до публикации.",
  swapConfirm: "Я проверил оба клуба и подтверждаю обмен позициями.",
  swapInvalid:
    "Не удалось поменять посев. Обновите страницу и проверьте разные позиции, подтверждение, версию и статус публикации.",
  seedAdjustment: "Ручная корректировка посева",
  chooseSeed: "Выберите позицию",

  groupStandings: "Таблица группы",
  refreshStandings: "Обновить таблицу",
  drawTies: "Жеребьёвка равных команд",
  tieDrawConfirm:
    "Подтверждаю случайную жеребьёвку оставшихся равных команд с записью в журнал. Повтор для выбора другого исхода невозможен.",
  standingsInvalid:
    "Обновите страницу и проверьте завершение группы и актуальность версии таблицы.",
  dependencyBlocked:
    "Зависимый матч заблокирован или начался. Организатор должен разрешить исправление до смены участников.",
  standingsEmpty:
    "Таблица ещё не рассчитана. Обновите её для просмотра текущих результатов.",
  standingsProvisional:
    "Предварительно: матчи группы не завершены. Выход в следующий этап пока закрыт.",
  standingsTied:
    "Группа завершена. Для оставшихся равных команд нужна жеребьёвка Организатора.",
  standingsFinal:
    "Группа завершена. Участники следующего этапа определены по этой версии.",
  standingPlayed: "Игр",
  standingWins: "Побед",
  standingLosses: "Поражений",
  standingGames: "Одиночные игры",
  standingSets: "Партии",
  standingPoints: "Очки",
  tieEvidence: "Основания порядка при равенстве",
  tieWins: "Победы в мини-таблице",
  tieGames: "Соотношение одиночных игр",
  tieSets: "Соотношение партий",
  tiePoints: "Соотношение очков",
  tieLot: "Жеребьёвка с записью в журнал",
  tieUnresolved: "Равенство не разрешено",
  sourcesPending:
    "Предыдущие результаты не утверждены. Составы доступны после определения участников.",

  lineupIntro:
    "Заявите пять допустимых игроков своей команды. Составы скрыты до подачи обеими сторонами.",
  manageLineup: "Составы на матч",
  noMatches: "Опубликованных матчей в вашей области доступа пока нет.",
  pagination: "Страницы",
  previousPage: "Предыдущая страница",
  nextPage: "Следующая страница",
  submitLineup: "Подать и заблокировать состав",
  lineupConfirm:
    "Подтверждаю пять разных игроков в установленном порядке полов. Подача блокирует состав. Замена судьёй возможна только до начала одиночной игры.",
  slot: "Позиция",
  lineupInvalid:
    "Проверьте пять разных игроков, порядок полов и допуск в текущем составе сезона. Поданный состав заблокирован.",
  replacePlayer: "Заменить игрока в составе",
  replacementPlayer: "Игрок на замену",
  replacementInvalid:
    "Замена не выполнена. Обновите состав и проверьте игрока, позицию, подтверждение и что одиночная игра ещё не началась.",
  replacementHelp:
    "Для ещё не начавшейся игры можно выбрать другого допущенного игрока состава того же пола. Исходная заявка и история замен сохраняются.",
  noReplacement:
    "Нет свободного допущенного запасного игрока или позиции до начала игры.",
  lineupsRevealed: "Оба состава раскрыты.",
  lineupsHidden:
    "Выбранные игроки скрыты до подачи обоих составов. Судьи видят только статус подачи.",
  lineupSubmitted: "Состав подан и заблокирован",
  lineupNotSubmitted: "Состав не подан",
  hiddenPlayers: "Игроки скрыты до общего раскрытия.",
  waitingForReveal: "Ожидание второго состава. Поданный состав заблокирован.",
  replacementHistory: "История замен",
  lineupUpdates: "Обновления составов подключены.",
  lineupUpdatesStale:
    "Обновления недоступны. Переподключение; перед изменениями обновите страницу.",
  lineupUpdatesChecking: "Проверка обновлений составов…",
  scheduled: "Запланирован",
  called: "Вызван на стол",
  in_progress: "Идёт",
  finished: "Завершён",
  cancelled: "Отменён",
  draws: "Жеребьёвки",
  drawIntro:
    "Зафиксируйте рейтинги посева, проверьте группы и связи матчей, затем опубликуйте. Опубликованная жеребьёвка не пересоздаётся.",
  generateDraw: "Создать жеребьёвку",
  regenerateDraw: "Пересоздать черновик жеребьёвки",
  publishDraw: "Опубликовать жеребьёвку",
  drawPublished: "Опубликована",
  publishedDrawLocked:
    "Опубликованная жеребьёвка заблокирована. Публичные страницы появятся на этапе публичного сайта.",
  noDraw: "Жеребьёвка ещё не создана.",
  drawSeasonRequired: "Сначала запустите полностью настроенный сезон.",
  seedFreezeConfirm:
    "Зафиксировать трёх лучших мальчиков и двух лучших девочек клуба по текущим рейтингам. При равных суммах применяется зафиксированный жребий. Пересоздание сохраняет историю черновиков.",
  publishDrawConfirm:
    "Группы и связи матчей проверены. Опубликовать эту версию и запретить пересоздание.",
  drawInvalid:
    "Не удалось изменить жеребьёвку. Проверьте подтверждение, статус сезона и последнюю версию, затем обновите страницу.",
  seedRosterRequired:
    "Для посева в составе каждого клуба должны быть минимум три активных мальчика и две активные девочки этого возраста.",
  drawUnsupported:
    "Для этого формата нужна поддерживаемая схема жеребьёвки. Доступны утверждённые четыре группы с тремя сетками, отдельные круговые группы и посеянные сетки на 2, 4, 8, 16 или 32 участника.",
  drawGroups: "Группы и сетки жеребьёвки",
  frozenSeeds: "Зафиксированный посев",
  frozenRating: "Зафиксированный рейтинг команды",
  seedingPlayers: "Игроки посева и зафиксированные рейтинги",
  matchGraph: "Связи матчей",
  matchGraphHelp:
    "Участники определяются по завершённым результатам. Откройте готовый матч для управления составами.",
  group: "Группа",
  match: "Матч",
  matches: "Матчи",
  round: "Раунд",
  winner: "Победитель",
  loser: "Проигравший",
  bracketPlaces: "Места в сетке",
  toBeDetermined: "Определится позже",
  configureTournament: "Настроить турнир",
  configurationIntro:
    "Настройте параметры и этапы до начала сезона. Предыдущие версии сохраняются.",
  kFactor: "Коэффициент K для Эло",
  changeK: "Изменить K для будущих результатов",
  saveSettings: "Сохранить параметры турнира",
  settingsInvalid:
    "Проверьте параметры или обновите страницу для загрузки последней версии. K должен быть положительным.",
  settingsHelp:
    "Каждое сохранение создаёт версию. После старта сезона меняется только K для будущих расчётов; прежние результаты сохраняют свой K.",
  tableCount: "Количество столов",
  restMinutes: "Минимальный отдых (минуты)",
  finalsPriority: "Приоритет финалов",
  finalsFirst: "Финалы в приоритете после обязательного отдыха",
  normalOrder: "Обычный порядок матчей",
  venueTimezone: "Часовой пояс зала",
  newTemplate: "Создать шаблон этапов",
  template: "Шаблон этапов",
  stageFormat: "Формат",
  composite: "Группы, затем сетки на выбывание",
  roundRobin: "Круговые группы",
  knockout: "Сетка на выбывание",
  groupCount: "Количество групп",
  groupSize: "Клубов в группе",
  bracketCount: "Количество сеток на выбывание",
  knockoutSize: "Участников в сетке",
  groupPlaces: "Места в группе",
  entries: "Участники",
  revision: "Версия",
  applyTemplate: "Применить шаблон",
  templateHelp:
    "В составном формате места в группах поровну распределяются по сеткам. Число участников сетки — степень двойки. По умолчанию: четыре группы по шесть, затем три сетки по восемь (места 1–2, 3–4, 5–6). Шаблон неизменяем; для другого формата создайте новый.",
  templateInvalid:
    "Проверьте формат. Все места должны входить ровно в одну сетку с допустимым числом участников.",
  stagePlans: "Планы этапов",
  noStagePlan: "План этапов не настроен.",
  stagePlanHelp:
    "Примените шаблон к выбранным возрастам. Замена плана до старта сохраняет предыдущие этапы.",
  stagePlanInvalid:
    "Выберите шаблон и хотя бы одну возрастную группу. Сезон ещё не должен быть запущен.",
  planHistory: "История планов этапов",
  drawsPending:
    "Планы определяют переходы по местам. Откройте жеребьёвки для проверки посева и связей матчей. Таблицы результатов и переходы появятся в следующих задачах.",
  tournamentSettings: "Параметры турнира",
  settingsHistory: "История параметров",
  startSeason: "Начать сезон",
  startConfirm:
    "Подтверждаю конфигурацию сезона. Старт блокирует даты, регистрацию клубов и планы этапов; доступны только будущие изменения K.",
  notReady: "Перед стартом завершите проверку готовности.",
  ready: "Готов к старту",
  unsupported_final_groups:
    "Для нескольких итоговых групп добавьте классификационные сетки. Также поддерживается одна итоговая круговая группа.",
  no_tours: "Добавьте хотя бы один турнир.",
  missing_settings: "Настройте параметры каждого турнира.",
  missing_stage_plans: "Настройте все три возраста в каждом турнире.",
  entry_count_mismatch:
    "Число зарегистрированных клубов должно соответствовать каждому плану этапов.",
  registeredClubs: "Зарегистрировано клубов",
  photos: "Фото и согласие",
  uploadPhoto: "Загрузить фото на проверку",
  photoFile: "Фото игрока (JPEG, PNG или WebP; до 2 МиБ)",
  consentEvidence:
    "Письменное согласие представителя (PDF или изображение; до 2 МиБ)",
  guardianPermission:
    "Подтверждаю наличие письменного разрешения представителя на публикацию фото игрока.",
  photoHelp:
    "Оригиналы и подтверждение согласия закрыты. Публикацию одобряет только организатор. Для повтора прерванной загрузки выберите те же файлы.",
  photoInvalid:
    "Проверьте файлы и подтверждение разрешения. Используйте допустимые форматы в пределах размера и разрешения.",
  photoUploadFailed:
    "Загрузка не завершена. Повторите с теми же файлами; если закрытое хранилище недоступно, обратитесь к оператору.",
  photoUploaded:
    "Файлы загружены в закрытое хранилище. Ожидается проверка организатора.",
  savePhotoReview: "Сохранить решение о публикации",
  reviewDecision: "Решение о публикации",
  approvePhoto: "Одобрить публикацию",
  rejectPhoto: "Отклонить загрузку",
  revokePhoto: "Отозвать публикацию",
  reviewPhotoHelp:
    "Перед одобрением проверьте фото и письменное согласие. Отзыв сразу закрывает публичное фото; оригиналы и журнал сохраняются.",
  photoPendingUpload: "Загрузка не завершена",
  photoPendingReview: "Ожидает проверки",
  photoApproved: "Публикация одобрена",
  photoRejected: "Загрузка отклонена",
  photoRevoked: "Публикация отозвана",
  viewPrivatePhoto: "Посмотреть закрытый оригинал",
  downloadConsent: "Скачать подтверждение согласия",
  viewPublicPhoto: "Посмотреть одобренное публичное фото",
  noPhotos: "Фото пока не загружены.",

  teams: "Клубы",
  region: "Регион",
  newTeam: "Создать клуб",
  noTeams: "Назначенных клубов пока нет.",
  teamsIntro:
    "Управляйте клубами, возрастными составами и игроками в пределах своих прав.",
  choose: "Выбрать",
  registerTeam: "Зарегистрировать клуб в сезоне",
  assignTrainer: "Назначить тренера",
  subteams: "Возрастные составы",
  trainerScopeHelp:
    "Тренер получит выбранные составы этого клуба. Назначение другого клуба заменяет прежнее назначение.",
  players: "Игроки",
  newPlayer: "Создать игрока",
  firstName: "Имя",
  lastName: "Фамилия",
  gender: "Пол",
  boy: "Мальчик",
  girl: "Девочка",
  dob: "Дата рождения (закрытые данные)",
  hand: "Игровая рука",
  right: "Правая",
  left: "Левая",
  style: "Стиль игры",
  sportsLevel: "Спортивный разряд",
  externalId: "ID внешнего рейтинга (необязательно)",
  playerPrivacy:
    "Запись игрока не создаёт аккаунт для входа. Дата рождения закрыта; начальный рейтинг — 1000. Для фото нужны письменное согласие представителя и одобрение организатора.",
  playerInvalid:
    "Проверьте данные игрока. Дата рождения должна соответствовать всем активным составам.",
  addRoster: "Добавить в состав",
  rosterHelp:
    "В состав входят активные игроки этой возрастной группы или младше. Максимум 10 на сезон. Турниры используют этот активный состав.",
  rosterInvalid:
    "Не удалось добавить игрока. Проверьте регистрацию, возраст, текущий клуб, статус и лимит состава.",
  removeRoster: "Завершить участие в составе",
  reason: "Причина",
  confirmAction: "Подтверждаю действие",
  ageIneligible:
    "Игрок старше допустимого возраста состава в этом сезоне. Младшие игроки могут играть в старших категориях.",
  dropPlayer: "Отметить выбытие",
  effectiveDate: "Дата события",
  transferPlayer: "Одобрить переход",
  receivingClub: "Принимающий клуб",
  transferHelp:
    "Переход завершает активное участие в составах и перемещает игрока в принимающий клуб. История сохраняется. Новый клуб затем добавляет игрока в подходящий сезонный состав.",
  saveTrainerRef: "Сохранить сведения о тренере",
  refKind: "Тип тренера",
  firstTrainer: "Первый тренер",
  personalTrainer: "Личный тренер",
  linkedTrainer: "Связанный тренер",
  freeTrainer: "Указать имя тренера ниже",
  trainerRefHelp:
    "Выберите существующего тренера и оставьте поля имени пустыми, либо укажите имя и фамилию без выбора тренера.",
  trainerRefInvalid:
    "Выберите тренера или введите имя и фамилию. Совмещать оба варианта нельзя.",
  rating: "Рейтинг",
  droppedOut: "Выбыл",
  editPlayer: "Редактировать игрока",
  trainerRefs: "Сведения о тренерах",
  noPlayers: "Игроков пока нет.",
  editTeam: "Редактировать клуб",
  registeredSeasons: "Сезоны участия",
  trainers: "Тренеры",
  roster: "Состав",
  registerFirst:
    "Сначала зарегистрируйте клуб в сезоне, затем выберите состав.",
  notAssigned: "Вам не назначено редактирование этого состава.",
  formerPlayer: "Бывший игрок клуба",
  ended: "Участие завершено",
  rosterFull: "Достигнут лимит состава: 10 активных игроков.",
  noEligiblePlayers:
    "Нет подходящих невыбранных игроков. Сначала создайте игрока в клубе.",

  refreshForms: "Обновить формы",
  seasons: "Сезоны",
  tours: "Турниры",
  seasonYear: "Год сезона для определения возраста",
  firstDay: "Дата начала",
  lastDay: "Дата окончания",
  ordinal: "Порядковый номер",
  newSeason: "Создать сезон",
  editSeason: "Редактировать сезон",
  newTour: "Добавить турнир",
  editTour: "Редактировать турнир",
  draft: "Черновик",
  started: "Начат",
  noTours: "Турниров пока нет.",
  noSeasons: "Сезонов пока нет.",
  configLocked: "Настройки сезона заблокированы.",
  ageRule:
    "Возраст на 31 декабря: U13 — до 13 лет, U15 — 13–14 лет, U17 — 15–16 лет. Младшие игроки могут играть в старших категориях.",
  seasonInvalid:
    "Проверьте название, год и даты сезона. Даты должны включать все существующие турниры.",
  tourInvalid:
    "Проверьте название, даты и номер турнира. Даты должны входить в сезон, а номер — быть уникальным.",
  seasonsIntro:
    "Укажите год для определения возраста и даты сезона, затем добавьте турниры по порядку.",
  seasonReadiness:
    "Для старта нужны параметры турниров, этапы всех возрастов и соответствующее число клубов.",

  league: "Лига настольного тенниса",
  workspace: "Рабочее пространство",
  staff: "Сотрудники",
  profile: "Мой профиль",
  signOut: "Выйти",
  signIn: "Войти",
  email: "Электронная почта",
  password: "Пароль",
  confirmPassword: "Повторите пароль",
  name: "Имя",
  roles: "Роли",
  organizer: "Организатор",
  main_judge: "Главный судья",
  trainer: "Тренер",
  line_judge: "Линейный судья",
  active: "Активен",
  inactive: "Неактивен",
  save: "Сохранить изменения",
  create: "Создать аккаунт сотрудника",
  reset: "Сбросить пароль",
  recovery: "Забыли пароль?",
  sendReset: "Отправить ссылку",
  back: "Вернуться ко входу",
  accountsOnly:
    "Аккаунты сотрудников создаёт организатор. Для доступа обратитесь к организатору лиги.",
  staffDenied:
    "Требуется активный аккаунт сотрудника лиги. Обратитесь к организатору.",
  failed:
    "Не удалось выполнить операцию. Проверьте данные и повторите попытку.",
  saved: "Изменения сохранены.",
  created:
    "Аккаунт создан. Передайте начальный пароль этому сотруднику безопасным способом.",
  resetDone: "Пароль обновлён.",
  recoveryDone:
    "Если аккаунт с такой почтой существует, вы получите ссылку для сброса пароля.",
  unavailable: "Авторизация не настроена.",
  callbackError: "Ссылка недействительна или устарела. Запросите новую ссылку.",
  staffIntro: "Создавайте аккаунты сотрудников и управляйте ролями и доступом.",
  initialPassword: "Начальный пароль (от 12 символов)",
  jobs: "Операции с аккаунтами",
  retry: "Повторить",
  pending: "Ожидает",
  complete: "Завершено",
  failedJob: "Ошибка",
  noStaff: "Нет аккаунтов сотрудников.",
  noJobs: "Операций пока нет.",
  coming:
    "Инструменты матчей, жеребьёвки и зала появятся после завершения соответствующих этапов реализации.",
  access: "Ваши права",
  selfProtection:
    "Нельзя отключить свой аккаунт или снять с себя роль организатора.",
  changePassword: "Выберите новый пароль",
  recoveryTitle: "Восстановление доступа",
  jobConflict:
    "Для этой почты уже есть операция. Повторите её ниже или используйте существующий аккаунт.",
  working: "Сохранение…",
  minPassword: "Введите от 12 до 128 символов. Пароли должны совпадать.",
  invalid: "Проверьте имя, почту и выбранные роли.",
  createHelp:
    "Приглашение по почте не отправляется. Организатор задаёт начальный пароль; сотрудник сможет сменить его после входа. Повтор операции сохраняет первоначальный пароль; если он неизвестен, сбросьте его.",
  resetHelp:
    "Задайте новый пароль активному сотруднику и передайте его безопасным способом.",
  directory: "Список сотрудников",
  publicHome: "Публичный сайт",
  activate: "Доступ к аккаунту",
  updated: "Обновлено",
  language: "Язык",
  unavailableOperation:
    "Администрирование Auth не настроено. Оператор должен указать серверный секрет.",
  savedAuthFailed:
    "Доступ сохранён в базе. Синхронизация Auth не удалась; сохраните повторно. Неактивные аккаунты уже лишены доступа к лиге.",
  resetHeading: "Задать пароль",
  displayName: "Отображаемое имя",
};
const kk: Messages = {
  lineupConflict:
    "Ауысудан кейін ойыншы екі жақта да көрсетілген. Төреші матч басталғанға дейін талапқа сай қосалқы ойыншыны таңдай алады.",

  swapSeeds: "Себу орындарын ауыстыру",
  seedA: "Бірінші себу орны",
  seedB: "Екінші себу орны",
  swapHelp:
    "Бекітілген ойыншылар мен рейтингтерді сақтап, екі орынды ауыстырыңыз. Алдыңғы нұсқалар тарихта қалады. Жариялауға дейін әрекетті растаңыз.",
  swapConfirm: "Екі клубты тексердім және орындарды ауыстыруды растаймын.",
  swapInvalid:
    "Себу ауыстырылмады. Бетті жаңартып, әртүрлі орындарды, растауды, нұсқаны және жариялау күйін тексеріңіз.",
  seedAdjustment: "Себуді қолмен түзету",
  chooseSeed: "Себу орнын таңдаңыз",

  groupStandings: "Топ кестесі",
  refreshStandings: "Кестені жаңарту",
  drawTies: "Тең командаларға жеребе тарту",
  tieDrawConfirm:
    "Қалған тең командаларға журналға жазылатын кездейсоқ жеребені растаймын. Қалаған нәтижені таңдау үшін қайталауға болмайды.",
  standingsInvalid:
    "Бетті жаңартып, топтың аяқталғанын және кесте нұсқасының өзектілігін тексеріңіз.",
  dependencyBlocked:
    "Тәуелді матч бұғатталған немесе басталған. Қатысушыларды өзгертпес бұрын Ұйымдастырушы түзетуді шешуі керек.",
  standingsEmpty: "Кесте әлі есептелмеген. Ағымдағы нәтижелер үшін жаңартыңыз.",
  standingsProvisional:
    "Алдын ала: топ матчтары аяқталмаған. Келесі кезеңге өту әлі жабық.",
  standingsTied:
    "Топ аяқталды. Қалған тең командаларға Ұйымдастырушы жеребе тартуы қажет.",
  standingsFinal:
    "Топ аяқталды. Келесі кезең қатысушылары осы нұсқа бойынша анықталды.",
  standingPlayed: "Ойын",
  standingWins: "Жеңіс",
  standingLosses: "Жеңіліс",
  standingGames: "Жекелей ойындар",
  standingSets: "Партиялар",
  standingPoints: "Ұпайлар",
  tieEvidence: "Теңдік кезіндегі рет негіздері",
  tieWins: "Шағын кестедегі жеңістер",
  tieGames: "Жекелей ойындар арақатынасы",
  tieSets: "Партиялар арақатынасы",
  tiePoints: "Ұпайлар арақатынасы",
  tieLot: "Журналға жазылған жеребе",
  tieUnresolved: "Теңдік шешілмеген",
  sourcesPending:
    "Алдыңғы нәтижелер бекітілмеген. Құрамдар қатысушылар анықталғаннан кейін қолжетімді.",

  lineupIntro:
    "Командаңыздың бес жарамды ойыншысын енгізіңіз. Екі жақ та жібергенге дейін құрамдар жасырын болады.",
  manageLineup: "Матч құрамдары",
  noMatches: "Қолжетімді аймақта жарияланған матчтар әлі жоқ.",
  pagination: "Беттер",
  previousPage: "Алдыңғы бет",
  nextPage: "Келесі бет",
  submitLineup: "Құрамды жіберіп бекіту",
  lineupConfirm:
    "Белгіленген жыныс ретімен бес бөлек ойыншыны растаймын. Жіберу құрамды бекітеді. Төреші тек жеке ойын басталғанға дейін ауыстыра алады.",
  slot: "Орын",
  lineupInvalid:
    "Бес бөлек ойыншыны, жыныс ретін және ағымдағы маусым құрамына жарамдылықты тексеріңіз. Жіберілген құрам бекітіледі.",
  replacePlayer: "Бекітілген ойыншыны ауыстыру",
  replacementPlayer: "Алмастыратын ойыншы",
  replacementInvalid:
    "Ауыстыру орындалмады. Құрамды жаңартып, ойыншыны, орынды, растауды және жеке ойынның басталмағанын тексеріңіз.",
  replacementHelp:
    "Басталмаған ойынға құрамдағы сол жыныстағы басқа жарамды ойыншы таңдалады. Бастапқы өтінім мен ауыстыру тарихы сақталады.",
  noReplacement: "Бос жарамды қосалқы ойыншы немесе басталмаған ойын орны жоқ.",
  lineupsRevealed: "Екі құрам да ашылды.",
  lineupsHidden:
    "Екі команда да жібергенше таңдалған ойыншылар жасырын. Төрешілер тек жіберу күйін көреді.",
  lineupSubmitted: "Құрам жіберіліп бекітілді",
  lineupNotSubmitted: "Құрам жіберілмеген",
  hiddenPlayers: "Ойыншылар бірге ашылғанға дейін жасырын.",
  waitingForReveal: "Екінші құрам күтілуде. Жіберілген құрам бекітілген.",
  replacementHistory: "Ауыстыру тарихы",
  lineupUpdates: "Құрам жаңартулары қосылған.",
  lineupUpdatesStale:
    "Жаңартулар қолжетімсіз. Қайта қосылуда; өзгерістер алдында бетті жаңартыңыз.",
  lineupUpdatesChecking: "Құрам жаңартулары тексерілуде…",
  scheduled: "Жоспарланған",
  called: "Үстелге шақырылған",
  in_progress: "Жүріп жатыр",
  finished: "Аяқталған",
  cancelled: "Бас тартылған",
  draws: "Жеребелер",
  drawIntro:
    "Себу рейтингтерін бекітіңіз, топтар мен матч байланыстарын тексеріп, жариялаңыз. Жарияланған жеребе қайта жасалмайды.",
  generateDraw: "Жеребе жасау",
  regenerateDraw: "Жеребе жобасын қайта жасау",
  publishDraw: "Жеребені жариялау",
  drawPublished: "Жарияланды",
  publishedDrawLocked:
    "Жарияланған жеребе бекітілген. Көпшілік беттер жария сайт тапсырмасында қосылады.",
  noDraw: "Жеребе әлі жасалмаған.",
  drawSeasonRequired: "Алдымен толық бапталған маусымды бастаңыз.",
  seedFreezeConfirm:
    "Әр клубтың үздік үш ұлы мен екі қызының ағымдағы рейтингтерін бекіту. Тең сомаларға тіркелетін жеребе қолданылады. Қайта жасау бұрынғы жоба тарихын сақтайды.",
  publishDrawConfirm:
    "Топтар мен матч байланыстары тексерілді. Осы нұсқаны жариялап, қайта жасауды бұғаттау.",
  drawInvalid:
    "Жеребе өзгертілмеді. Растауды, маусым күйін және соңғы нұсқаны тексеріп, бетті жаңартыңыз.",
  seedRosterRequired:
    "Себу үшін әр клубтың маусым құрамында осы жастағы кемінде үш белсенді ұл және екі белсенді қыз болуы керек.",
  drawUnsupported:
    "Бұл пішімге қолдау көрсетілетін жеребе сызбасы керек. Бекітілген төрт топ пен үш тор, жеке айналмалы топтар және 2, 4, 8, 16 не 32 қатысушыға себілген торлар қолжетімді.",
  drawGroups: "Жеребе топтары мен торлары",
  frozenSeeds: "Бекітілген себу",
  frozenRating: "Бекітілген команда рейтингі",
  seedingPlayers: "Себу ойыншылары мен бекітілген рейтингтер",
  matchGraph: "Матч байланыстары",
  matchGraphHelp:
    "Қатысушылар аяқталған нәтижелер бойынша анықталады. Құрамдарды басқару үшін дайын матчты ашыңыз.",
  group: "Топ",
  match: "Матч",
  matches: "Матчтар",
  round: "Раунд",
  winner: "Жеңімпаз",
  loser: "Жеңілген",
  bracketPlaces: "Тордағы орындар",
  toBeDetermined: "Кейін анықталады",
  configureTournament: "Турнирді баптау",
  configurationIntro:
    "Маусым басталғанша параметрлер мен кезеңдерді баптаңыз. Алдыңғы нұсқалар сақталады.",
  kFactor: "Эло K коэффициенті",
  changeK: "Болашақ нәтижелер үшін K өзгерту",
  saveSettings: "Турнир параметрлерін сақтау",
  settingsInvalid:
    "Параметрлерді тексеріңіз немесе соңғы нұсқаны жүктеу үшін бетті жаңартыңыз. K оң сан болуы керек.",
  settingsHelp:
    "Әр сақтау нұсқа жасайды. Маусым басталған соң тек K болашақ есептеулер үшін өзгереді; бұрынғы нәтижелер өз K мәнін сақтайды.",
  tableCount: "Үстел саны",
  restMinutes: "Ең аз демалыс (минут)",
  finalsPriority: "Финалдардың басымдығы",
  finalsFirst: "Міндетті демалыстан кейін финалдар бірінші",
  normalOrder: "Қалыпты матч реті",
  venueTimezone: "Залдың уақыт белдеуі",
  newTemplate: "Кезең үлгісін жасау",
  template: "Кезең үлгісі",
  stageFormat: "Пішім",
  composite: "Топтар, кейін шығару торлары",
  roundRobin: "Айналмалы топтар",
  knockout: "Шығару торы",
  groupCount: "Топ саны",
  groupSize: "Топтағы клуб саны",
  bracketCount: "Шығару торларының саны",
  knockoutSize: "Тордағы қатысушы саны",
  groupPlaces: "Топтағы орындар",
  entries: "Қатысушылар",
  revision: "Нұсқа",
  applyTemplate: "Үлгіні қолдану",
  templateHelp:
    "Құрама пішімде топ орындары торларға тең бөлінеді. Тор қатысушыларының саны екінің дәрежесі болуы керек. Әдепкісі: алтыдан төрт топ, кейін сегізден үш тор (1–2, 3–4, 5–6 орындар). Үлгі өзгермейді; басқа пішім үшін жаңасын жасаңыз.",
  templateInvalid:
    "Пішімді тексеріңіз. Әр орын қатысушылар саны жарамды бір ғана торға кіруі керек.",
  stagePlans: "Кезең жоспарлары",
  noStagePlan: "Кезең жоспары бапталмаған.",
  stagePlanHelp:
    "Үлгіні таңдалған жас топтарына қолданыңыз. Басталғанға дейін жоспарды ауыстыру бұрынғы кезеңдерді сақтайды.",
  stagePlanInvalid:
    "Үлгіні және кемінде бір жас тобын таңдаңыз. Маусым әлі басталмаған болуы керек.",
  planHistory: "Кезең жоспарларының тарихы",
  drawsPending:
    "Жоспарлар орын бойынша өтуді анықтайды. Себу мен матч байланыстарын тексеру үшін жеребелерді ашыңыз. Нәтижелер мен өту келесі тапсырмаларда қосылады.",
  tournamentSettings: "Турнир параметрлері",
  settingsHistory: "Параметрлер тарихы",
  startSeason: "Маусымды бастау",
  startConfirm:
    "Маусым баптауын растаймын. Бастау күндерді, клуб тіркеуін және кезең жоспарларын бекітеді; тек болашақ K өзгерістері қолжетімді болады.",
  notReady: "Бастамас бұрын дайындық тізімін аяқтаңыз.",
  ready: "Бастауға дайын",
  unsupported_final_groups:
    "Бірнеше қорытынды топ үшін жіктеу торларын қосыңыз. Бір қорытынды айналмалы топ та қолдау табады.",
  no_tours: "Кемінде бір турнир қосыңыз.",
  missing_settings: "Әр турнирдің параметрлерін баптаңыз.",
  missing_stage_plans: "Әр турнирде үш жас тобын да баптаңыз.",
  entry_count_mismatch:
    "Тіркелген клуб саны әр кезең жоспарының қатысушы санына сәйкес болуы керек.",
  registeredClubs: "Тіркелген клубтар",
  photos: "Фото және келісім",
  uploadPhoto: "Фотоны тексеруге жүктеу",
  photoFile: "Ойыншы фотосы (JPEG, PNG немесе WebP; 2 МиБ дейін)",
  consentEvidence: "Заңды өкілдің жазбаша келісімі (PDF не сурет; 2 МиБ дейін)",
  guardianPermission:
    "Ойыншы фотосын жариялауға заңды өкілінің жазбаша рұқсаты бар екенін растаймын.",
  photoHelp:
    "Түпнұсқа мен келісім дәлелі жабық. Жариялауды тек ұйымдастырушы мақұлдайды. Үзілген жүктеуді қайталау үшін сол файлдарды таңдаңыз.",
  photoInvalid:
    "Файлдар мен рұқсат растауын тексеріңіз. Рұқсат етілген пішімдерді көлем және ажыратымдылық шегінде пайдаланыңыз.",
  photoUploadFailed:
    "Жүктеу аяқталмады. Сол файлдармен қайталаңыз; жабық сақтау қолжетімсіз болса, операторға хабарласыңыз.",
  photoUploaded:
    "Файлдар жабық сақтауға жүктелді. Ұйымдастырушының тексеруі күтілуде.",
  savePhotoReview: "Жариялау шешімін сақтау",
  reviewDecision: "Жариялау шешімі",
  approvePhoto: "Жариялауды мақұлдау",
  rejectPhoto: "Жүктеуді қабылдамау",
  revokePhoto: "Жариялауды қайтарып алу",
  reviewPhotoHelp:
    "Мақұлдар алдында фото мен жазбаша келісімді тексеріңіз. Қайтарып алу жария фотоны бірден жабады; түпнұсқа мен журнал сақталады.",
  photoPendingUpload: "Жүктеу аяқталмаған",
  photoPendingReview: "Тексеру күтілуде",
  photoApproved: "Жариялау мақұлданды",
  photoRejected: "Жүктеу қабылданбады",
  photoRevoked: "Жариялау қайтарылды",
  viewPrivatePhoto: "Жабық түпнұсқаны көру",
  downloadConsent: "Келісім дәлелін жүктеп алу",
  viewPublicPhoto: "Мақұлданған жария фотоны көру",
  noPhotos: "Фото әлі жүктелмеген.",

  teams: "Клубтар",
  region: "Аймақ",
  newTeam: "Клуб құру",
  noTeams: "Тағайындалған клубтар әлі жоқ.",
  teamsIntro:
    "Өз өкілеттігіңіз шегінде клубтарды, жас топтарын және ойыншыларды басқарыңыз.",
  choose: "Таңдау",
  registerTeam: "Клубты маусымға тіркеу",
  assignTrainer: "Жаттықтырушыны тағайындау",
  subteams: "Жас топтарының құрамдары",
  trainerScopeHelp:
    "Жаттықтырушы осы клубтың таңдалған құрамдарына тағайындалады. Басқа клубқа тағайындау бұрынғысын ауыстырады.",
  players: "Ойыншылар",
  newPlayer: "Ойыншы құру",
  firstName: "Аты",
  lastName: "Тегі",
  gender: "Жынысы",
  boy: "Ұл",
  girl: "Қыз",
  dob: "Туған күні (жеке дерек)",
  hand: "Ойын қолы",
  right: "Оң",
  left: "Сол",
  style: "Ойын стилі",
  sportsLevel: "Спорттық дәреже",
  externalId: "Сыртқы рейтинг ID (міндетті емес)",
  playerPrivacy:
    "Ойыншы жазбасы кіру аккаунтын құрмайды. Туған күні жабық; бастапқы рейтинг — 1000. Фотоға заңды өкілдің жазбаша келісімі және ұйымдастырушының мақұлдауы қажет.",
  playerInvalid:
    "Ойыншы деректерін тексеріңіз. Туған күні барлық белсенді құрамдардың жас тобына сәйкес болуы керек.",
  addRoster: "Құрамға қосу",
  rosterHelp:
    "Осы жас тобындағы немесе одан кіші белсенді ойыншылар қосылады. Маусымдық құрамда ең көбі 10 ойыншы. Турнирлер осы белсенді құрамды пайдаланады.",
  rosterInvalid:
    "Ойыншы қосылмады. Тіркелуін, жасын, қазіргі клубын, күйін және құрам шегін тексеріңіз.",
  removeRoster: "Құрамға қатысуды аяқтау",
  reason: "Себеп",
  confirmAction: "Әрекетті растаймын",
  ageIneligible:
    "Ойыншы осы маусымдағы құрамның жас шегінен үлкен. Кіші ойыншылар үлкен санаттарда ойнай алады.",
  dropPlayer: "Шыққанын белгілеу",
  effectiveDate: "Оқиға күні",
  transferPlayer: "Ауысуды мақұлдау",
  receivingClub: "Қабылдаушы клуб",
  transferHelp:
    "Ауысу белсенді құрамдарға қатысуды аяқтап, ойыншыны қабылдаушы клубқа өткізеді. Тарих сақталады. Жаңа клуб кейін оны тиісті маусымдық құрамға қосады.",
  saveTrainerRef: "Жаттықтырушы дерегін сақтау",
  refKind: "Жаттықтырушы түрі",
  firstTrainer: "Алғашқы жаттықтырушы",
  personalTrainer: "Жеке жаттықтырушы",
  linkedTrainer: "Байланыстырылған жаттықтырушы",
  freeTrainer: "Жаттықтырушы атын төменде енгізу",
  trainerRefHelp:
    "Бар жаттықтырушыны таңдап, аты-жөнін бос қалдырыңыз немесе жаттықтырушыны таңдамай, аты мен тегін енгізіңіз.",
  trainerRefInvalid:
    "Жаттықтырушыны таңдаңыз немесе аты мен тегін енгізіңіз. Екеуін қатар қолдануға болмайды.",
  rating: "Рейтинг",
  droppedOut: "Шықты",
  editPlayer: "Ойыншыны өңдеу",
  trainerRefs: "Жаттықтырушылар деректері",
  noPlayers: "Ойыншылар әлі жоқ.",
  editTeam: "Клубты өңдеу",
  registeredSeasons: "Қатысатын маусымдар",
  trainers: "Жаттықтырушылар",
  roster: "Құрам",
  registerFirst: "Алдымен клубты маусымға тіркеп, кейін құрамды таңдаңыз.",
  notAssigned: "Бұл құрамды өңдеу сізге тағайындалмаған.",
  formerPlayer: "Клубтың бұрынғы ойыншысы",
  ended: "Қатысу аяқталды",
  rosterFull: "Құрам шегіне жетті: 10 белсенді ойыншы.",
  noEligiblePlayers:
    "Таңдалмаған жарамды ойыншылар жоқ. Алдымен клубта ойыншы құрыңыз.",

  refreshForms: "Пішіндерді жаңарту",
  seasons: "Маусымдар",
  tours: "Турнирлер",
  seasonYear: "Жасты анықтау үшін маусым жылы",
  firstDay: "Басталу күні",
  lastDay: "Аяқталу күні",
  ordinal: "Реттік нөмір",
  newSeason: "Маусым құру",
  editSeason: "Маусымды өңдеу",
  newTour: "Турнир қосу",
  editTour: "Турнирді өңдеу",
  draft: "Жоба",
  started: "Басталды",
  noTours: "Турнирлер әлі жоқ.",
  noSeasons: "Маусымдар әлі жоқ.",
  configLocked: "Маусым баптаулары бұғатталған.",
  ageRule:
    "31 желтоқсандағы жас: U13 — 13 жасқа дейін, U15 — 13–14 жас, U17 — 15–16 жас. Кіші ойыншылар үлкен санаттарда ойнай алады.",
  seasonInvalid:
    "Маусымның атауын, жылын және күндерін тексеріңіз. Күндер барлық турнирлерді қамтуы керек.",
  tourInvalid:
    "Турнирдің атауын, күндерін және нөмірін тексеріңіз. Күндер маусымға сәйкес, нөмір бірегей болуы керек.",
  seasonsIntro:
    "Жасты анықтайтын жылды және маусым күндерін көрсетіп, турнирлерді ретімен қосыңыз.",
  seasonReadiness:
    "Бастау үшін турнир параметрлері, барлық жас кезеңдері және сәйкес клуб саны қажет.",

  league: "Үстел теннисі лигасы",
  workspace: "Жұмыс кеңістігі",
  staff: "Қызметкерлер",
  profile: "Менің профилім",
  signOut: "Шығу",
  signIn: "Кіру",
  email: "Электрондық пошта",
  password: "Құпиясөз",
  confirmPassword: "Құпиясөзді қайталаңыз",
  name: "Аты",
  roles: "Рөлдер",
  organizer: "Ұйымдастырушы",
  main_judge: "Бас төреші",
  trainer: "Жаттықтырушы",
  line_judge: "Сызық төрешісі",
  active: "Белсенді",
  inactive: "Белсенді емес",
  save: "Өзгерістерді сақтау",
  create: "Қызметкер аккаунтын құру",
  reset: "Құпиясөзді қалпына келтіру",
  recovery: "Құпиясөзді ұмыттыңыз ба?",
  sendReset: "Сілтеме жіберу",
  back: "Кіруге оралу",
  accountsOnly:
    "Қызметкер аккаунттарын ұйымдастырушы құрады. Қол жеткізу үшін лига ұйымдастырушысына хабарласыңыз.",
  staffDenied:
    "Лиганың белсенді қызметкер аккаунты қажет. Ұйымдастырушыға хабарласыңыз.",
  failed: "Операция орындалмады. Деректерді тексеріп, қайталап көріңіз.",
  saved: "Өзгерістер сақталды.",
  created:
    "Аккаунт құрылды. Бастапқы құпиясөзді қызметкерге қауіпсіз түрде жеткізіңіз.",
  resetDone: "Құпиясөз жаңартылды.",
  recoveryDone:
    "Бұл поштаға тіркелген аккаунт болса, құпиясөзді қалпына келтіру сілтемесі жіберіледі.",
  unavailable: "Авторизация бапталмаған.",
  callbackError: "Сілтеме жарамсыз немесе ескірген. Жаңа сілтеме сұратыңыз.",
  staffIntro:
    "Қызметкерлердің аккаунттарын құрып, рөлдері мен қолжетімділігін басқарыңыз.",
  initialPassword: "Бастапқы құпиясөз (кемінде 12 таңба)",
  jobs: "Аккаунт операциялары",
  retry: "Қайталау",
  pending: "Күтуде",
  complete: "Аяқталды",
  failedJob: "Қате",
  noStaff: "Қызметкер аккаунттары жоқ.",
  noJobs: "Операциялар әлі жоқ.",
  coming:
    "Матч, жеребе және зал құралдары тиісті іске асыру кезеңдері аяқталғаннан кейін пайда болады.",
  access: "Сіздің құқықтарыңыз",
  selfProtection:
    "Өз аккаунтыңызды өшіруге немесе өзіңізден ұйымдастырушы рөлін алып тастауға болмайды.",
  changePassword: "Жаңа құпиясөз таңдаңыз",
  recoveryTitle: "Қолжетімділікті қалпына келтіру",
  jobConflict:
    "Бұл пошта үшін операция бар. Төменде қайталаңыз немесе бар аккаунтты пайдаланыңыз.",
  working: "Сақталуда…",
  minPassword: "12–128 таңба енгізіңіз. Құпиясөздер сәйкес болуы керек.",
  invalid: "Аты, пошта және таңдалған рөлдерді тексеріңіз.",
  createHelp:
    "Пошта арқылы шақыру жіберілмейді. Ұйымдастырушы бастапқы құпиясөзді орнатады; қызметкер кіргеннен кейін оны өзгерте алады. Қайталау бастапқы құпиясөзді сақтайды; ол белгісіз болса, оны қалпына келтіріңіз.",
  resetHelp:
    "Белсенді қызметкерге жаңа құпиясөз орнатып, оны қауіпсіз түрде жеткізіңіз.",
  directory: "Қызметкерлер тізімі",
  publicHome: "Жария сайт",
  activate: "Аккаунтқа қол жеткізу",
  updated: "Жаңартылды",
  language: "Тіл",
  unavailableOperation:
    "Auth әкімшілігі бапталмаған. Оператор сервер құпиясын көрсетуі керек.",
  savedAuthFailed:
    "Қолжетімділік дерекқорда сақталды. Auth синхрондалмады; қайта сақтаңыз. Белсенді емес аккаунттар лигаға кіре алмайды.",
  resetHeading: "Құпиясөз орнату",
  displayName: "Көрсетілетін аты",
};
export function messages(locale: Locale): Messages {
  return { ru, kk, en }[locale];
}

// New confirmations retain the legacy audit-note storage without inventing explanations.
export function actionNote(locale: Locale, note: string | null | undefined) {
  return note === "Action confirmed" ? messages(locale).confirmAction : note;
}
