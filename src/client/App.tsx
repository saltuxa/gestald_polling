import { Check, Plus, Radio, ShieldCheck, Square, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { CreatePollInput, PollState, PrivacyMode } from "../shared/types";
import { castVote, closePoll, createPoll, getPoll, subscribePoll } from "./api";
import { detectLocale, useTranslator } from "./i18n";
import { fetchDisplayName, onTwitchAuthorized, requestIdentityShare, type ExtensionSession } from "./twitch";

type ViewMode = "viewer" | "dashboard";

export function App() {
  const locale = useMemo(detectLocale, []);
  const t = useTranslator(locale);
  const [session, setSession] = useState<ExtensionSession | null>(null);
  const [state, setState] = useState<PollState>({ poll: null, counts: {}, voters: [] });
  const [error, setError] = useState<string | null>(null);

  const mode = getViewMode();

  useEffect(() => {
    onTwitchAuthorized(setSession);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setError((current) => current ?? "Twitch authorization is not ready yet. Refresh the extension or check Hosted Test settings.");
    }, 5000);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!session?.token) {
      return;
    }

    getPoll(session).then(setState).catch((err: Error) => setError(err.message));
    return subscribePoll(session, setState, () => undefined);
  }, [session]);

  if (!session) {
    return (
      <Shell title={t("appName")} subtitle={t("loading")}>
        {error ? <div className="notice error">{error}</div> : null}
      </Shell>
    );
  }

  return (
    <Shell title={mode === "dashboard" ? t("dashboard") : t("appName")} subtitle={state.poll?.status === "closed" ? t("closed") : state.poll ? t("live") : ""}>
      {error ? <div className="notice error">{error}</div> : null}
      {mode === "dashboard" ? (
        <DashboardView session={session} state={state} setState={setState} setError={setError} t={t} />
      ) : (
        <ViewerView session={session} state={state} setState={setState} setError={setError} t={t} />
      )}
    </Shell>
  );
}

function ViewerView({
  session,
  state,
  setState,
  setError,
  t
}: {
  session: ExtensionSession;
  state: PollState;
  setState: (state: PollState) => void;
  setError: (error: string | null) => void;
  t: ReturnType<typeof useTranslator>;
}) {
  const [selected, setSelected] = useState<string>("");
  const [isVoting, setIsVoting] = useState(false);

  if (!state.poll) {
    return <EmptyState title={t("noPoll")} body={t("noPollHint")} />;
  }

  const totalVotes = state.voters.length;
  const hasVoted = Boolean(state.viewerVoteOptionId);
  const canVote = session.isLinked && !hasVoted && state.poll.status === "active";

  async function submitVote() {
    if (!selected || !canVote) {
      return;
    }

    setIsVoting(true);
    setError(null);
    try {
      const displayName = await fetchDisplayName(session);
      setState(await castVote(session, { optionId: selected, displayName }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    } finally {
      setIsVoting(false);
    }
  }

  return (
    <div className="stack">
      {!session.isLinked ? (
        <div className="notice">
          <ShieldCheck size={18} />
          <span>{t("identityRequired")}</span>
          <button className="secondary" onClick={requestIdentityShare}>
            {t("shareIdentity")}
          </button>
        </div>
      ) : null}

      <section className="poll">
        <h1>{state.poll.question}</h1>
        <div className="options">
          {state.poll.options.map((option) => {
            const votes = state.counts[option.id] ?? 0;
            const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
            const chosen = selected === option.id || state.viewerVoteOptionId === option.id;
            return (
              <button key={option.id} className={`option ${chosen ? "selected" : ""}`} disabled={!canVote} onClick={() => setSelected(option.id)}>
                <span className="optionTop">
                  <span>{option.label}</span>
                  <strong>{percent}%</strong>
                </span>
                <span className="meter">
                  <span style={{ width: `${percent}%` }} />
                </span>
                <span className="muted">
                  {votes} {t("votes")}
                </span>
              </button>
            );
          })}
        </div>
        <button className="primary" disabled={!selected || !canVote || isVoting} onClick={submitVote}>
          {hasVoted ? <Check size={18} /> : <Radio size={18} />}
          {hasVoted ? t("voted") : t("vote")}
        </button>
        {hasVoted ? <p className="muted center">{t("alreadyVoted")}</p> : null}
      </section>

      <VoterList state={state} t={t} />
    </div>
  );
}

function DashboardView({
  session,
  state,
  setState,
  setError,
  t
}: {
  session: ExtensionSession;
  state: PollState;
  setState: (state: PollState) => void;
  setError: (error: string | null) => void;
  t: ReturnType<typeof useTranslator>;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>("anonymous_choice");
  const canManage = session.role === "broadcaster" || session.role === "moderator";

  async function submitPoll() {
    const input: CreatePollInput = {
      question,
      options: options.map((option) => option.trim()).filter(Boolean),
      privacyMode
    };

    setError(null);
    try {
      setState(await createPoll(session, input));
      setQuestion("");
      setOptions(["", ""]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    }
  }

  async function finishPoll() {
    setError(null);
    try {
      setState(await closePoll(session));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error"));
    }
  }

  return (
    <div className="dashboardGrid">
      <section className="panel">
        {!canManage ? <div className="notice error">Only broadcasters and moderators can manage polls.</div> : null}
        <label>
          {t("question")}
          <input value={question} maxLength={140} onChange={(event) => setQuestion(event.target.value)} />
        </label>
        <div className="stack compact">
          {options.map((option, index) => (
            <label key={index}>
              {t("option")} {index + 1}
              <input
                value={option}
                maxLength={80}
                onChange={(event) => setOptions(options.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))}
              />
            </label>
          ))}
        </div>
        <button className="secondary" disabled={options.length >= 6} onClick={() => setOptions([...options, ""])}>
          <Plus size={18} />
          {t("addOption")}
        </button>
        <fieldset>
          <legend>{t("privacy")}</legend>
          <label className="radioLine">
            <input type="radio" checked={privacyMode === "anonymous_choice"} onChange={() => setPrivacyMode("anonymous_choice")} />
            {t("anonymousChoice")}
          </label>
          <label className="radioLine">
            <input type="radio" checked={privacyMode === "public_choice"} onChange={() => setPrivacyMode("public_choice")} />
            {t("publicChoice")}
          </label>
        </fieldset>
        <button className="primary" disabled={!canManage} onClick={submitPoll}>
          <Radio size={18} />
          {t("createPoll")}
        </button>
      </section>

      <section className="panel">
        {state.poll ? (
          <>
            <div className="panelHeader">
              <h2>{state.poll.question}</h2>
              {state.poll.status === "active" ? (
                <button className="danger" disabled={!canManage} onClick={finishPoll}>
                  <X size={18} />
                  {t("closePoll")}
                </button>
              ) : null}
            </div>
            <Results state={state} t={t} />
            <VoterList state={state} t={t} />
          </>
        ) : (
          <EmptyState title={t("noPoll")} body={t("noPollHint")} />
        )}
      </section>
    </div>
  );
}

function Results({ state, t }: { state: PollState; t: ReturnType<typeof useTranslator> }) {
  if (!state.poll) {
    return null;
  }

  const totalVotes = state.voters.length;
  return (
    <div className="results">
      <h2>{t("results")}</h2>
      {state.poll.options.map((option) => {
        const votes = state.counts[option.id] ?? 0;
        const percent = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
        return (
          <div className="resultRow" key={option.id}>
            <span>{option.label}</span>
            <strong>{votes}</strong>
            <span className="meter">
              <span style={{ width: `${percent}%` }} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

function VoterList({ state, t }: { state: PollState; t: ReturnType<typeof useTranslator> }) {
  if (!state.poll) {
    return null;
  }

  const optionById = new Map(state.poll.options.map((option) => [option.id, option.label]));
  return (
    <section className="voters">
      <h2>{t("voters")}</h2>
      {state.voters.length === 0 ? (
        <p className="muted">0 {t("votes")}</p>
      ) : (
        <div className="voterList">
          {state.voters.map((voter) => (
            <div className="voter" key={voter.userId}>
              <span>{voter.displayName}</span>
              {voter.optionId ? <strong>{optionById.get(voter.optionId)}</strong> : <Square size={14} />}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <section className="empty">
      <h1>{title}</h1>
      <p>{body}</p>
    </section>
  );
}

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <main>
      <header>
        <div>
          <span className="brand">{title}</span>
          {subtitle ? <span className="status">{subtitle}</span> : null}
        </div>
      </header>
      {children}
    </main>
  );
}

function getViewMode(): ViewMode {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("mode");
  const path = window.location.pathname;
  if (mode === "dashboard" || path.includes("dashboard") || path.includes("config")) {
    return "dashboard";
  }
  return "viewer";
}
