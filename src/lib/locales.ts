export const locales = ["ru", "kk", "en"] as const;
export type Locale = (typeof locales)[number];
export function localeOf(value: unknown): Locale {
  return value === "kk" || value === "en" ? value : "ru";
}
const en = {
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
    "Season, team and hall tools will appear here as their implementation tasks are completed.",
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
    "Инструменты сезонов, команд и зала появятся после завершения соответствующих этапов реализации.",
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
    "Маусым, команда және зал құралдары тиісті іске асыру кезеңдері аяқталғаннан кейін пайда болады.",
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
