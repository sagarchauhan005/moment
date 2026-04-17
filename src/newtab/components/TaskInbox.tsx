import { useMemo, useState } from "react";
import {
  CheckSquare,
  ChevronDown,
  Inbox,
  MoreHorizontal,
  Maximize2,
  Plus,
  Sun,
  CheckCheck,
  Calendar,
  Link as LinkIcon,
  Trash2,
} from "lucide-react";
import { addTask, deleteTask, tasksForList, toggleTask } from "@/lib/tasks";
import { store } from "@/lib/storage";
import type { Task, TaskList, TaskSource, UserPrefs } from "@/types";

const SYSTEM_LISTS: { id: string; name: string; Icon: typeof Inbox }[] = [
  { id: "inbox", name: "Inbox", Icon: Inbox },
  { id: "today", name: "Today", Icon: Sun },
  { id: "completed", name: "Completed", Icon: CheckCheck },
  { id: "upcoming", name: "Upcoming", Icon: Calendar },
];

const SOURCE_COLORS: Record<TaskSource, string> = {
  local: "text-white/50",
  linear: "text-violet-300/90",
  trello: "text-sky-300/90",
  asana: "text-rose-300/90",
};

export function TaskInbox({
  tasks,
  lists,
  prefs,
  onExpand,
}: {
  tasks: Task[];
  lists: TaskList[];
  prefs: UserPrefs;
  onExpand: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [picker, setPicker] = useState(false);
  const [hideChecked, setHideChecked] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const activeListId = prefs.activeListId;
  const systemList = SYSTEM_LISTS.find((l) => l.id === activeListId);
  const customList = !systemList
    ? lists.find((l) => l.id === activeListId)
    : undefined;
  const activeList: { id: string; name: string; Icon: typeof Inbox } = systemList ??
    (customList
      ? { id: customList.id, name: customList.name, Icon: LinkIcon }
      : SYSTEM_LISTS[0]);

  const visibleTasks = useMemo(() => {
    const filtered = tasksForList(tasks, activeListId);
    filtered.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return b.createdAt - a.createdAt;
    });
    return hideChecked ? filtered.filter((t) => !t.completed) : filtered;
  }, [tasks, activeListId, hideChecked]);

  const inboxCount = tasks.filter(
    (t) => t.listId === "inbox" && !t.completed
  ).length;
  const todayCount = tasksForList(tasks, "today").filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;

  const counts: Record<string, number> = {
    inbox: inboxCount,
    today: todayCount,
    completed: completedCount,
    upcoming: tasks.filter((t) => t.dueAt && t.dueAt > Date.now()).length,
  };

  const commitAdd = async () => {
    if (!draft.trim()) {
      setAdding(false);
      return;
    }
    const list = activeListId === "today" ? "inbox" : activeListId;
    await addTask(draft, list);
    setDraft("");
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-5 right-5 icon-btn glass w-10 h-10"
        title="Open tasks"
      >
        <CheckSquare className="w-[18px] h-[18px]" strokeWidth={1.5} />
        <span className="sr-only">Tasks</span>
      </button>
    );
  }

  return (
    <div className="absolute bottom-16 right-5 w-[340px] glass p-3 animate-scale-in">
      <div className="flex items-center justify-between px-2 py-1.5">
        <button
          onClick={() => setPicker((v) => !v)}
          className="flex items-center gap-2 text-white/95"
        >
          <activeList.Icon className="w-[17px] h-[17px]" strokeWidth={1.5} />
          <span className="text-[15px] font-medium">
            {activeListId === "inbox"
              ? "Task Inbox"
              : activeList.name}
          </span>
          <ChevronDown
            className={`w-[14px] h-[14px] opacity-70 transition-transform ${picker ? "rotate-180" : ""}`}
          />
        </button>
        <div className="flex items-center gap-0.5">
          <button
            className="icon-btn w-7 h-7"
            title={hideChecked ? "Show completed" : "Hide completed"}
            onClick={() => setHideChecked((v) => !v)}
          >
            <MoreHorizontal className="w-[16px] h-[16px]" strokeWidth={1.5} />
          </button>
          <button
            className="icon-btn w-7 h-7"
            title="Expand"
            onClick={onExpand}
          >
            <Maximize2 className="w-[15px] h-[15px]" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {picker ? (
        <ListPicker
          counts={counts}
          extra={lists.filter((l) => l.source !== "local")}
          active={activeListId}
          onPick={async (id) => {
            await store.patchPrefs({ activeListId: id });
            setPicker(false);
          }}
        />
      ) : (
        <>
          <div className="max-h-[300px] overflow-y-auto moment-scroll py-1">
            {visibleTasks.length === 0 && (
              <div className="text-center text-white/40 text-xs py-6">
                {activeListId === "completed"
                  ? "Nothing finished yet today."
                  : "Empty — add your first task below."}
              </div>
            )}
            {visibleTasks.map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
          </div>
          <div
            className="task-row cursor-text text-white/50 hover:text-white/80"
            onClick={() => setAdding(true)}
          >
            {adding ? (
              <>
                <span className="check-box" data-checked="false" />
                <input
                  autoFocus
                  className="bg-transparent outline-none border-none flex-1 text-sm"
                  value={draft}
                  placeholder="New task"
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      await commitAdd();
                    } else if (e.key === "Escape") {
                      setAdding(false);
                      setDraft("");
                    }
                  }}
                  onBlur={async () => {
                    await commitAdd();
                    setAdding(false);
                  }}
                />
              </>
            ) : (
              <>
                <Plus className="w-[15px] h-[15px]" strokeWidth={1.5} />
                <span className="text-sm">New task</span>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  return (
    <div className="task-row group" data-completed={task.completed}>
      <button
        className="check-box"
        data-checked={task.completed}
        onClick={() => void toggleTask(task.id)}
        aria-label={task.completed ? "Uncheck" : "Check"}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="5 13 10 18 20 7" />
        </svg>
      </button>
      <span className="title flex-1 truncate">{task.title}</span>
      {task.source !== "local" && (
        <span
          className={`text-[10px] uppercase tracking-wider shrink-0 ${SOURCE_COLORS[task.source]}`}
          title={task.source}
        >
          {task.source}
        </span>
      )}
      {task.source === "local" && (
        <button
          className="opacity-0 group-hover:opacity-100 transition-opacity text-white/50 hover:text-white/90"
          onClick={(e) => {
            e.stopPropagation();
            void deleteTask(task.id);
          }}
          title="Delete"
        >
          <Trash2 className="w-[13px] h-[13px]" strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}

function ListPicker({
  counts,
  extra,
  active,
  onPick,
}: {
  counts: Record<string, number>;
  extra: TaskList[];
  active: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="py-1.5">
      {SYSTEM_LISTS.map(({ id, name, Icon }) => (
        <button
          key={id}
          className={`flex items-center justify-between w-full px-2.5 py-2 rounded-md text-[13.5px] transition-colors ${
            active === id ? "bg-white/8 text-white" : "text-white/85 hover:bg-white/5"
          }`}
          onClick={() => onPick(id)}
        >
          <span className="flex items-center gap-2.5">
            <Icon className="w-[15px] h-[15px]" strokeWidth={1.5} />
            {name}
          </span>
          <span className="text-white/50 text-[12px]">{counts[id] ?? 0}</span>
        </button>
      ))}
      {extra.map((l) => (
        <button
          key={l.id}
          className={`flex items-center justify-between w-full px-2.5 py-2 rounded-md text-[13.5px] ${
            active === l.id ? "bg-white/8 text-white" : "text-white/85 hover:bg-white/5"
          }`}
          onClick={() => onPick(l.id)}
        >
          <span className="flex items-center gap-2.5">
            <LinkIcon className="w-[15px] h-[15px]" strokeWidth={1.5} />
            {l.name}
          </span>
        </button>
      ))}
      <div className="h-px bg-white/8 my-2 mx-1" />
      <button
        onClick={() => chrome.runtime.openOptionsPage?.()}
        className="flex items-center justify-between w-full px-2.5 py-2 rounded-md text-[13px] text-white/65 hover:bg-white/5"
      >
        <span className="flex items-center gap-2.5">
          <LinkIcon className="w-[15px] h-[15px]" strokeWidth={1.5} />
          Connect integration
        </span>
        <span className="text-[9px] font-semibold px-1.5 py-0.5 bg-white/10 rounded">
          PLUS
        </span>
      </button>
    </div>
  );
}
