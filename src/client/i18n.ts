export type Locale = "ru" | "en";

const messages = {
  ru: {
    appName: "Gestald Vote",
    noPoll: "Активного голосования нет",
    noPollHint: "Опрос появится здесь, когда стример или модератор запустит его.",
    createPoll: "Запустить голосование",
    closePoll: "Завершить",
    question: "Вопрос",
    option: "Вариант",
    addOption: "Добавить вариант",
    privacy: "Приватность",
    anonymousChoice: "Скрыть выбор пользователей",
    publicChoice: "Показать выбор пользователей",
    vote: "Голосовать",
    voted: "Голос принят",
    voters: "Проголосовали",
    votes: "голосов",
    identityRequired: "Чтобы голосовать, разрешите расширению видеть ваш Twitch ID.",
    shareIdentity: "Разрешить Twitch ID",
    dashboard: "Панель управления",
    live: "Live",
    closed: "Завершено",
    alreadyVoted: "Вы уже проголосовали",
    loading: "Загрузка...",
    error: "Что-то пошло не так",
    results: "Результаты"
  },
  en: {
    appName: "Gestald Vote",
    noPoll: "No active poll",
    noPollHint: "A poll will appear here when the streamer or a moderator starts one.",
    createPoll: "Start poll",
    closePoll: "Close",
    question: "Question",
    option: "Option",
    addOption: "Add option",
    privacy: "Privacy",
    anonymousChoice: "Hide user choices",
    publicChoice: "Show user choices",
    vote: "Vote",
    voted: "Vote saved",
    voters: "Voters",
    votes: "votes",
    identityRequired: "Share your Twitch ID with this extension to vote.",
    shareIdentity: "Share Twitch ID",
    dashboard: "Dashboard",
    live: "Live",
    closed: "Closed",
    alreadyVoted: "You already voted",
    loading: "Loading...",
    error: "Something went wrong",
    results: "Results"
  }
} satisfies Record<Locale, Record<string, string>>;

export type MessageKey = keyof typeof messages.ru;

export function detectLocale(): Locale {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("language") ?? params.get("locale") ?? navigator.language;
  return raw.toLowerCase().startsWith("ru") ? "ru" : "en";
}

export function useTranslator(locale: Locale) {
  return (key: MessageKey) => messages[locale][key] ?? messages.en[key];
}
