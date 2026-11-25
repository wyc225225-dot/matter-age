import { useState, useRef } from "react";
import { Volume2, Play, Download, Upload, ShieldCheck } from "lucide-react";
import { useGame } from "../stores/game";
import {
  challenges,
  historyChapters,
  museumItems,
  quantitativeChallenges,
  reviewedAdvancedRules,
  specialChallenges,
  substances,
  reactions,
  technologies,
} from "../data";
import { PageHeading } from "../components/Shared";

export default function SettingsPage({
  toast,
}: {
  toast: (s: string) => void;
}) {
  const game = useGame();
  const [confirm, setConfirm] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className="page-width standard-page">
      <PageHeading
        kicker="YOUR LABORATORY"
        title="实验室设置"
        description="让探索按照你的节奏进行。所有数据都留在当前设备。"
      />
      <div className="settings-layout">
        <section className="panel settings-card">
          <h2>体验偏好</h2>
          {(
            [
              [
                "sound",
                "发现音效",
                "新物质发现时，播放轻柔的提示音。",
                Volume2,
              ],
              [
                "motion",
                "实验动画",
                "播放参数化反应动画；关闭以减少动态效果。",
                Play,
              ],
            ] as const
          ).map(([key, title, text, Icon]) => (
            <div className="setting-row" key={key}>
              <Icon size={20} />
              <div>
                <strong>{title}</strong>
                <p>{text}</p>
              </div>
              <button
                className={`toggle ${game.save.settings[key] ? "on" : ""}`}
                role="switch"
                aria-label={title}
                aria-checked={game.save.settings[key]}
                onClick={() =>
                  game.update((s) => ({
                    ...s,
                    settings: { ...s.settings, [key]: !s.settings[key] },
                  }))
                }
              >
                <span />
              </button>
            </div>
          ))}
          <h2>存档管理（v3 · 兼容 v1/v2 自动迁移）</h2>
          <p className="muted">
            IndexedDB 自动保存（当前版本 v{game.save.version}）。导出 JSON
            文件可在其他设备导入；导入旧版 v1 或 v2
            存档时会自动迁移保留全部发现、定量研究、挑战、成就与设置，且不会重复触发历史首发现奖励。
          </p>
          <div className="save-actions">
            <button
              className="secondary"
              onClick={() => {
                const blob = new Blob([JSON.stringify(game.save, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `matter-age-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                toast("存档已导出。");
              }}
            >
              <Download size={17} />
              导出存档
            </button>
            <button
              className="secondary"
              onClick={() => input.current?.click()}
            >
              <Upload size={17} />
              导入存档
            </button>
            <input
              hidden
              type="file"
              accept="application/json,.json"
              ref={input}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  if (f.size > 2_000_000) throw new Error("文件过大");
                  const data = JSON.parse(await f.text());
                  game.importSave(data);
                  toast("存档已校验并恢复。");
                } catch {
                  toast("导入失败：文件版本、结构或物质数据不合法。");
                }
                e.target.value = "";
              }}
            />
          </div>
          <div className="reset-zone">
            <h3>重新开始</h3>
            <p>
              重置所有发现、研究等级、实验记录、挑战和设置。建议先导出备份。
            </p>
            {confirm ? (
              <div className="save-actions">
                <button
                  className="danger"
                  onClick={() => {
                    game.reset();
                    setConfirm(false);
                    toast("已回到初始的五种材料。");
                  }}
                >
                  确认清除全部进度
                </button>
                <button className="secondary" onClick={() => setConfirm(false)}>
                  取消
                </button>
              </div>
            ) : (
              <button
                className="danger-outline"
                onClick={() => setConfirm(true)}
              >
                重置进度
              </button>
            )}
          </div>
        </section>
        <section className="knowledge-card">
          <div>
            <ShieldCheck size={18} />
            关于物质纪元
          </div>
          <h3>V1.6 科学策略与实验室经营开发预览</h3>
          <p>
            当前为 V1.6 开发预览，包含 {substances.length} 个物质收集项、
            {reactions.length} 条候选规则（其中{" "}
            {reactions.filter((r) => r.stoichiometrySupported).length}
            条适用定量计量预览）、{challenges.length} 道简单挑战、
            {quantitativeChallenges.length} 道进阶定量挑战、
            {specialChallenges.length} 道特殊挑战、{technologies.length}{" "}
            项科技节点、{historyChapters.filter((c) => c.playable).length}/
            {historyChapters.length} 个可玩科学史章节与 {museumItems.length}{" "}
            件博物馆藏品。正式 release
            发布前所有科学及科学史内容仍需逐条人工审核（当前已审核{" "}
            {reviewedAdvancedRules.length} /{" "}
            {reactions.filter((r) => r.stoichiometrySupported).length}）。
          </p>
          <p>
            简单模式专注物质路径探索；进阶模式支持整数化学计量、限制反应物、剩余物质、原子守恒与方程式配平；困难模式将在
            V2.0 推出。
          </p>
          <p>支持离线：在生产构建中首次联网打开后，等待资源缓存完成。</p>
        </section>
      </div>
    </div>
  );
}
