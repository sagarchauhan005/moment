import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckSquare, ChevronDown, Inbox, MoreHorizontal, Maximize2,
  Plus, Sun, CheckCheck, RefreshCw, Trash2, X,
} from "lucide-react";
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  addTask, deleteTask, patchTask, reorderTasks, tasksForList, toggleTask,
} from "@/lib/tasks";
import { store } from "@/lib/storage";
import type { Task, TaskSource, UserPrefs } from "@/types";

const PRIORITY_SORT: Record<string, number> = { high: 0, medium: 1, low: 2 };
const PRIORITY_COLOR: Record<string, string> = {
  high: "bg-red-400",
  medium: "bg-amber-400",
  low: "bg-sky-400",
};
const PRIORITY_LABEL: Record<string, string> = {
  high: "High priority",
  medium: "Medium priority",
  low: "Low priority",
};

const SYSTEM_LISTS = [
  { id: "inbox",     name: "Inbox",     Icon: Inbox },
  { id: "today",     name: "Today",     Icon: Sun },
  { id: "completed", name: "Completed", Icon: CheckCheck },
];

const SOURCE_COLORS: Record<TaskSource, string> = {
  local:  "text-white/50",
  linear: "text-violet-300/90",
  asana:  "text-rose-300/90",
};

interface CtxMenu { taskId: string; x: number; y: number }

export function TaskInbox({
  tasks,
  prefs,
  onExpand,
}: {
  tasks: Task[];
  prefs: UserPrefs;
  onExpand: () => void;
}) {
  const INBOX_TTL = 4 * 60 * 60 * 1000; // 4 hours in ms
  const isWithinTTL = (ts?: number | null) =>
    !!ts && Date.now() - ts < INBOX_TTL;

  const initialOpenedAt = isWithinTTL(prefs.taskInboxOpenedAt) ? (prefs.taskInboxOpenedAt ?? null) : null;
  const [openedAt, setOpenedAt]   = useState<number | null>(initialOpenedAt);
  const [open, setOpen]           = useState(() => !!initialOpenedAt);
  const [picker, setPicker]       = useState(false);
  const [hideChecked, setHideChecked] = useState(false);
  const [adding, setAdding]       = useState(false);
  const [draft, setDraft]         = useState("");
  const [ctxMenu, setCtxMenu]     = useState<CtxMenu | null>(null);
  const [syncing, setSyncing]     = useState(false);

  // Auto-close after remaining TTL
  useEffect(() => {
    if (!open || !openedAt) return;
    const remaining = INBOX_TTL - (Date.now() - openedAt);
    if (remaining <= 0) { setOpen(false); return; }
    const id = setTimeout(() => { setOpen(false); setOpenedAt(null); }, remaining);
    return () => clearTimeout(id);
  }, [open, openedAt]);

  const openInbox = () => {
    const now = Date.now();
    setOpen(true);
    setOpenedAt(now);
    void store.patchPrefs({ taskInboxOpenedAt: now });
  };
  const closeInbox = () => {
    setOpen(false);
    setOpenedAt(null);
    void store.patchPrefs({ taskInboxOpenedAt: null });
  };

  const activeListId = prefs.activeListId;
  const activeList   = SYSTEM_LISTS.find((l) => l.id === activeListId) ?? SYSTEM_LISTS[0];

  const visibleTasks = useMemo(() => {
    const filtered = tasksForList(tasks, activeListId);
    filtered.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (!a.completed) {
        const pa = PRIORITY_SORT[a.priority ?? ""] ?? 3;
        const pb = PRIORITY_SORT[b.priority ?? ""] ?? 3;
        if (pa !== pb) return pa - pb;
        const sa = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const sb = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
        if (sa !== sb) return sa - sb;
      }
      return b.createdAt - a.createdAt;
    });
    return hideChecked ? filtered.filter((t) => !t.completed) : filtered;
  }, [tasks, activeListId, hideChecked]);

  const counts = {
    inbox:     tasks.filter((t) => t.listId === "inbox" && !t.completed).length,
    today:     tasksForList(tasks, "today").filter((t) => !t.completed).length,
    completed: tasks.filter((t) => t.completed).length,
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const incomplete = visibleTasks.filter((t) => !t.completed);
      const oldIdx = incomplete.findIndex((t) => t.id === active.id);
      const newIdx = incomplete.findIndex((t) => t.id === over.id);
      if (oldIdx === -1 || newIdx === -1) return;
      const reordered = arrayMove(incomplete, oldIdx, newIdx);
      await reorderTasks(reordered.map((t) => t.id));
    },
    [visibleTasks]
  );

  const commitAdd = async () => {
    if (!draft.trim()) { setAdding(false); return; }
    const list = activeListId === "completed" ? "inbox" : activeListId;
    await addTask(draft, list);
    setDraft("");
  };

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    try { await chrome.runtime.sendMessage({ type: "remote-sync-now" }); }
    finally { setSyncing(false); }
  };

  const openCtx = (taskId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setCtxMenu({
      taskId,
      x: Math.min(e.clientX, window.innerWidth  - 200),
      y: Math.min(e.clientY, window.innerHeight - 240),
    });
  };

  const closeCtx = () => setCtxMenu(null);

  const ctxTask = ctxMenu ? tasks.find((t) => t.id === ctxMenu.taskId) : null;

  const isDraggable = activeListId !== "completed";
  const incompleteTasks = visibleTasks.filter((t) => !t.completed);
  const completedTasks  = visibleTasks.filter((t) =>  t.completed);

  if (!open) {
    return (
      <div className="absolute bottom-5 right-5 z-20 flex flex-col items-center gap-1">
        <button
          onClick={openInbox}
          className="icon-btn glass w-10 h-10"
          title="Open tasks"
        >
          <CheckSquare className="w-[18px] h-[18px]" strokeWidth={1.5} />
        </button>
        <span className="text-[10px] text-white/55 tracking-wide">Tasks</span>
      </div>
    );
  }

  return (
    <>
      <div className="absolute bottom-16 right-5 w-[340px] glass p-3 animate-scale-in z-20">
        {/* Header */}
        <div className="flex items-center justify-between px-2 py-1.5">
          <button
            onClick={() => setPicker((v) => !v)}
            className="flex items-center gap-2 text-white/95"
          >
            <activeList.Icon className="w-[17px] h-[17px]" strokeWidth={1.5} />
            <span className="text-[15px] font-medium">
              {activeListId === "inbox" ? "Task Inbox" : activeList.name}
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
            <button className="icon-btn w-7 h-7" title="Expand" onClick={onExpand}>
              <Maximize2 className="w-[15px] h-[15px]" strokeWidth={1.5} />
            </button>
            <button className="icon-btn w-7 h-7" title="Close" onClick={closeInbox}>
              <X className="w-[15px] h-[15px]" strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {picker ? (
          <ListPicker
            counts={counts}
            active={activeListId}
            syncing={syncing}
            onPick={async (id) => { await store.patchPrefs({ activeListId: id }); setPicker(false); }}
            onSync={handleSync}
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

              {isDraggable ? (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={incompleteTasks.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {incompleteTasks.map((t) => (
                      <SortableTaskRow key={t.id} task={t} onContextMenu={(e) => openCtx(t.id, e)} />
                    ))}
                  </SortableContext>
                </DndContext>
              ) : (
                incompleteTasks.map((t) => (
                  <TaskRow key={t.id} task={t} onContextMenu={(e) => openCtx(t.id, e)} />
                ))
              )}

              {completedTasks.map((t) => (
                <TaskRow key={t.id} task={t} onContextMenu={(e) => openCtx(t.id, e)} />
              ))}
            </div>

            {activeListId !== "completed" && (
              <div
                className="task-row cursor-text text-white/50 hover:text-white/80"
                onClick={() => setAdding(true)}
              >
                {adding ? (
                  <>
                    <span className="w-[18px] h-[18px] shrink-0 rounded-[5px] border border-white/20" />
                    <input
                      autoFocus
                      className="bg-transparent outline-none border-none flex-1 text-[13px]"
                      value={draft}
                      placeholder="New task"
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") await commitAdd();
                        else if (e.key === "Escape") { setAdding(false); setDraft(""); }
                      }}
                      onBlur={async () => { await commitAdd(); setAdding(false); }}
                    />
                  </>
                ) : (
                  <>
                    <span className="w-[18px] h-[18px] shrink-0 flex items-center justify-center">
                      <Plus className="w-[13px] h-[13px]" strokeWidth={2} />
                    </span>
                    <span className="text-[13px]">New task</span>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Context menu */}
      {ctxMenu && ctxTask && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={closeCtx}
            onContextMenu={(e) => { e.preventDefault(); closeCtx(); }}
          />
          <div
            className="fixed z-50 glass w-48 py-1 rounded-xl shadow-xl text-[13px]"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
          >
            {ctxTask.listId !== "inbox" && (
              <CtxItem onClick={async () => { await patchTask(ctxTask.id, { listId: "inbox" }); closeCtx(); }}>
                Move to Inbox
              </CtxItem>
            )}
            {ctxTask.listId !== "today" && (
              <CtxItem onClick={async () => { await patchTask(ctxTask.id, { listId: "today" }); closeCtx(); }}>
                Move to Today
              </CtxItem>
            )}
            {ctxTask.source === "local" && !ctxTask.externalId && (prefs.asanaToken || prefs.linearApiKey) && (
              <CtxItem
                onClick={() => {
                  void chrome.runtime
                    .sendMessage({ type: "push-flow-task", taskId: ctxTask.id, title: ctxTask.title })
                    .catch(() => null);
                  closeCtx();
                }}
              >
                Push to {prefs.asanaToken ? "Asana" : "Linear"}
              </CtxItem>
            )}
            <div className="h-px bg-white/10 my-1 mx-2" />
            {(["high", "medium", "low", null] as const).map((p) => (
              <CtxItem
                key={String(p)}
                active={ctxTask.priority === p}
                onClick={async () => { await patchTask(ctxTask.id, { priority: p }); closeCtx(); }}
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full mr-2 shrink-0 ${p ? PRIORITY_COLOR[p] : "bg-white/20"}`}
                />
                {p ? p.charAt(0).toUpperCase() + p.slice(1) : "No priority"}
              </CtxItem>
            ))}
            <div className="h-px bg-white/10 my-1 mx-2" />
            <CtxItem
              className="text-red-400/80 hover:text-red-400"
              onClick={async () => { await deleteTask(ctxTask.id); closeCtx(); }}
            >
              Delete
            </CtxItem>
          </div>
        </>
      )}
    </>
  );
}

function CtxItem({
  children,
  onClick,
  active,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      className={`flex items-center w-full px-3 py-1.5 text-left hover:bg-white/8 transition-colors ${
        active ? "text-white" : "text-white/75"
      } ${className ?? ""}`}
      onClick={onClick}
    >
      <span className="w-4 shrink-0 mr-0.5">{active ? "✓" : ""}</span>
      {children}
    </button>
  );
}

function SortableTaskRow({
  task,
  onContextMenu,
}: {
  task: Task;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={isDragging ? "opacity-50 cursor-grabbing" : "cursor-grab"}
    >
      <TaskRow task={task} onContextMenu={onContextMenu} />
    </div>
  );
}

function TaskRow({
  task,
  onContextMenu,
}: {
  task: Task;
  onContextMenu?: (e: React.MouseEvent) => void;
}) {
  const synced = task.source !== "local";
  return (
    <div
      className="task-row group"
      data-completed={task.completed}
      onContextMenu={onContextMenu}
    >
      <button
        className="check-box shrink-0"
        data-checked={task.completed}
        onClick={(e) => { e.stopPropagation(); void toggleTask(task.id); }}
        aria-label={task.completed ? "Uncheck" : "Check"}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="5 13 10 18 20 7" />
        </svg>
      </button>
      <span className="title flex-1 min-w-0 truncate">{task.title}</span>
      {synced && (
        <span
          className={`text-[9.5px] uppercase tracking-wider shrink-0 ${SOURCE_COLORS[task.source]}`}
          title={`Synced to ${task.source}`}
        >
          {task.source}
        </span>
      )}
      {task.priority && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${PRIORITY_COLOR[task.priority]}`}
          title={PRIORITY_LABEL[task.priority]}
        />
      )}
      <button
        className="opacity-0 group-hover:opacity-100 transition-opacity text-white/40 hover:text-white/80 shrink-0"
        onClick={(e) => { e.stopPropagation(); void deleteTask(task.id); }}
        title="Delete"
      >
        <Trash2 className="w-[12px] h-[12px]" strokeWidth={1.5} />
      </button>
    </div>
  );
}

function ListPicker({
  counts,
  active,
  syncing,
  onPick,
  onSync,
}: {
  counts: Record<string, number>;
  active: string;
  syncing: boolean;
  onPick: (id: string) => void;
  onSync: () => void;
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
      <div className="h-px bg-white/8 my-2 mx-1" />
      <button
        onClick={onSync}
        disabled={syncing}
        className="flex items-center w-full px-2.5 py-2 rounded-md text-[13px] text-white/65 hover:bg-white/5 disabled:opacity-40 transition-colors"
      >
        <RefreshCw
          className={`w-[15px] h-[15px] mr-2.5 ${syncing ? "animate-spin" : ""}`}
          strokeWidth={1.5}
        />
        {syncing ? "Syncing…" : "Sync now"}
      </button>
    </div>
  );
}
