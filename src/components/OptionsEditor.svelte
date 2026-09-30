<script>
  import { createEventDispatcher, tick } from "svelte";
  import Icon from "./Icon.svelte";
  import { moveOption, nextOptionMark, optionWarning } from "../lib/options.js";

  export let options = [];

  const dispatch = createEventDispatcher();
  const rows = new Map();
  let draggedOption = null;
  let dropTarget = null;
  let removedOption = null;
  let announcement = "";
  let emptyAddButton;

  $: warning = optionWarning(options);

  function labelDialog(node) {
    // Flowbite's modal title is visual only; associate it with the dialog for AT.
    const dialog = node.closest('[role="dialog"]');
    const heading = dialog?.querySelector(".options-modal-header h3");
    if (!heading) return;
    heading.id = "options-editor-title";
    dialog.setAttribute("aria-labelledby", heading.id);
  }

  function registerRow(node, option) {
    rows.set(option, node);
    return { destroy: () => rows.delete(option) };
  }

  function change(next) {
    dispatch("change", { options: next });
  }

  function editOption(option, field, value) {
    option[field] = value;
    removedOption = null;
    change([...options]);
  }

  async function focusOption(option) {
    await tick();
    const row = rows.get(option);
    row?.querySelector(".name-field input")?.focus();
  }

  export async function addOption() {
    const option = { mark: nextOptionMark(options), name: "", cnt: 0 };
    removedOption = null;
    change([...options, option]);
    announcement = `已添加选项 ${option.mark}，请填写内容。`;
    await focusOption(option);
  }

  async function removeOption(option) {
    const index = options.indexOf(option);
    const next = options.filter((item) => item !== option);
    removedOption = { option, index };
    change(next);
    announcement = `已删除选项 ${option.mark || index + 1}，可点击撤销恢复。`;
    const neighbor = next[Math.min(index, next.length - 1)];
    if (neighbor) {
      await focusOption(neighbor);
    } else {
      await tick();
      emptyAddButton?.focus();
    }
  }

  function undoRemove() {
    if (!removedOption) return;
    const { option, index } = removedOption;
    const next = [...options];
    next.splice(Math.min(index, next.length), 0, option);
    removedOption = null;
    change(next);
    announcement = `已恢复选项 ${option.mark || index + 1}。`;
    focusOption(option);
  }

  async function reorder(option, to, restoreFocus = true) {
    const from = options.indexOf(option);
    const next = moveOption(options, from, to);
    if (next === options) return;
    const focused = document.activeElement;
    removedOption = null;
    change(next);
    announcement = `选项 ${option.mark || from + 1} 已移到第 ${to + 1} 位，共 ${next.length} 项。`;
    await tick();
    if (restoreFocus && focused instanceof HTMLElement) {
      if (focused instanceof HTMLButtonElement && focused.disabled) {
        rows.get(option)?.querySelector(".name-field input")?.focus();
      } else {
        focused.focus();
      }
    } else {
      rows.get(option)?.querySelector(".name-field input")?.focus({ preventScroll: true });
    }
  }

  function startDrag(event, option) {
    draggedOption = option;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", option.mark);
    const row = rows.get(option);
    if (row) event.dataTransfer.setDragImage(row, 24, 24);
  }

  function dragOver(event, option) {
    if (!draggedOption) return;
    if (draggedOption === option) {
      dropTarget = null;
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const rect = event.currentTarget.getBoundingClientRect();
    dropTarget = { option, before: event.clientY < rect.top + rect.height / 2 };
  }

  function finishDrag() {
    draggedOption = null;
    dropTarget = null;
  }

  function drop(event, option) {
    if (!draggedOption) return;
    event.preventDefault();
    if (draggedOption !== option) {
      const rect = event.currentTarget.getBoundingClientRect();
      const from = options.indexOf(draggedOption);
      let to = options.indexOf(option) + (event.clientY < rect.top + rect.height / 2 ? 0 : 1);
      if (from < to) to--;
      reorder(draggedOption, to, false);
    }
    finishDrag();
  }
</script>

<div class="options-editor" use:labelDialog>
  <div class="editor-introduction">
    <p>直接编辑标记与内容，拖动左侧手柄或使用上下按钮调整顺序。</p>
    <span class="option-count">{options.length} 个选项</span>
  </div>
  <div class="order-note">
    <Icon name="info" size={16} />
    <p>顺序决定展示位置和弹幕匹配优先级。<strong>重排不会改变选项标记。</strong></p>
  </div>

  {#if removedOption}
    <div class="undo-notice">
      <span>已删除选项「{removedOption.option.mark || "未设置标记"}」</span>
      <button type="button" on:click={undoRemove}><Icon name="undo" size={14} />撤销</button>
    </div>
  {/if}

  {#if options.length}
    <div class="editor-columns" aria-hidden="true"><span>顺序</span><span>弹幕标记</span><span>选项内容</span><span>操作</span></div>
    <ol class="option-editor-list" aria-label="投票选项，按展示和匹配优先级排列">
      {#each options as option, index (option)}
        <li
          class="option-editor-row"
          class:is-dragging={draggedOption === option}
          class:drop-before={dropTarget?.option === option && dropTarget.before}
          class:drop-after={dropTarget?.option === option && !dropTarget.before}
          use:registerRow={option}
          on:dragover={(event) => dragOver(event, option)}
          on:drop={(event) => drop(event, option)}
        >
          <div class="order-column">
            <span
              class="drag-handle"
              draggable={options.length > 1}
              aria-hidden="true"
              title="拖动调整顺序"
              on:dragstart={(event) => startDrag(event, option)}
              on:dragend={finishDrag}
            ><Icon name="grip" size={16} strokeWidth={2.6} /></span>
            <span class="position-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          </div>
          <label class="row-field mark-field">
            <span class="field-caption">弹幕标记</span>
            <input type="text" value={option.mark} aria-label={"选项 " + (index + 1) + " 的弹幕标记"} placeholder="如 A" on:input={(event) => editOption(option, "mark", event.currentTarget.value)} />
          </label>
          <label class="row-field name-field">
            <span class="field-caption">选项内容</span>
            <input type="text" value={option.name} aria-label={"选项 " + (index + 1) + " 的内容"} placeholder="输入选项内容" on:input={(event) => editOption(option, "name", event.currentTarget.value)} />
          </label>
          <div class="row-actions">
            <div class="sort-actions">
              <button type="button" disabled={index === 0} aria-label={"上移选项 " + (index + 1)} title="上移" on:click={() => reorder(option, index - 1)}><Icon name="up" size={16} /></button>
              <button type="button" disabled={index === options.length - 1} aria-label={"下移选项 " + (index + 1)} title="下移" on:click={() => reorder(option, index + 1)}><Icon name="down" size={16} /></button>
            </div>
            <button type="button" class="delete-option" aria-label={"删除选项 " + (index + 1)} title="删除选项" on:click={() => removeOption(option)}><Icon name="trash" size={16} /></button>
          </div>
        </li>
      {/each}
    </ol>
  {:else}
    <div class="empty-options">
      <span class="empty-icon"><Icon name="sliders" size={26} /></span>
      <h3>还没有投票选项</h3>
      <p>添加一个选项，设置观众可以发送的弹幕标记。</p>
      <button type="button" bind:this={emptyAddButton} on:click={addOption}><Icon name="plus" size={16} />添加第一个选项</button>
    </div>
  {/if}

  {#if warning}
    <div class="option-warning"><Icon name="info" size={15} /><p>{warning}</p></div>
  {/if}
  <p class="matching-hint">例如标记为 A，观众发送「A」或「我选 A」即可参与；同时命中多项时，只计入靠前的第一项。</p>
  <div class="sr-only" aria-live="polite" aria-atomic="true">{announcement}</div>
</div>

<style>
  .editor-introduction { display: flex; align-items: flex-start; justify-content: space-between; gap: 15px; margin-bottom: 16px; }
  .editor-introduction > p { margin: 0; color: #85909f; font-size: 12px; line-height: 1.7; }
  .option-count { flex-shrink: 0; padding: 3px 7px; border-radius: 5px; color: #8b94a3; background: #f3f5f8; font-size: 11px; white-space: nowrap; }
  .order-note { display: flex; align-items: center; gap: 9px; margin-bottom: 22px; padding: 12px 13px; border: 1px solid #f5e1e9; border-radius: 8px; background: #fff8fb; color: #cd7995; }
  .order-note > p { margin: 0; color: #9c7a89; font-size: 12px; line-height: 1.7; }
  .order-note strong { color: #af6c86; font-weight: 500; }
  .editor-columns, .option-editor-row { display: grid; grid-template-columns: 27px 85px minmax(0, 1fr) 104px; align-items: center; column-gap: 12px; }
  .editor-columns { padding: 0 13px; margin-bottom: 9px; color: #919aa8; font-size: 11px; }
  .editor-columns > span:first-child { font-size: 10px; text-align: center; }
  .editor-columns > span:last-child { text-align: center; }
  .option-editor-list { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
  .option-editor-row { position: relative; padding: 13px; border: 1px solid #e8ebf1; border-radius: 9px; background: #fff; transition: border-color 150ms, box-shadow 150ms; }
  .option-editor-row:focus-within { border-color: #edc5d3; box-shadow: 0 0 0 2px #fff5f8; }
  .order-column { display: flex; align-items: center; flex-direction: column; gap: 4px; color: #a5adba; }
  .drag-handle { display: inline-flex; align-items: center; justify-content: center; width: 25px; height: 20px; color: #9eaabb; cursor: grab; user-select: none; }
  .drag-handle:hover { color: #d06d8f; }
  .drag-handle:active { cursor: grabbing; }
  .drag-handle[draggable="false"] { cursor: default; opacity: 0.4; }
  .position-number { font-size: 10px; font-variant-numeric: tabular-nums; line-height: 1; }
  .row-field { display: block; min-width: 0; }
  .field-caption { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
  .row-field input { width: 100%; height: 41px; padding: 10px 11px; border: 1px solid #e1e5ed; border-radius: 6px; background: #fafbfc; color: #4b5567; font-size: 13px; line-height: 1.5; }
  .row-field input::placeholder { color: #b3bac5; }
  .row-field input:hover { border-color: #cbd3df; }
  .row-field input:focus { border-color: #ec9ab5; outline: none; background: #fff; box-shadow: 0 0 0 2px #fff0f5; }
  .mark-field input { text-align: center; font-weight: 600; color: #d46089; background: #fffbfd; }
  .row-actions, .sort-actions { display: flex; align-items: center; }
  .row-actions { justify-content: flex-end; gap: 8px; }
  .sort-actions { gap: 1px; padding: 2px; border: 1px solid #e9ecf2; border-radius: 6px; background: #fafbfc; }
  .row-actions button { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 30px; padding: 0; border: 0; border-radius: 4px; color: #8b97a8; background: transparent; cursor: pointer; }
  .row-actions button:hover:not(:disabled) { color: #b96080; background: #fceef4; }
  .row-actions button:focus-visible { outline: 2px solid #e984a8; outline-offset: 2px; }
  .row-actions button:disabled { color: #d1d6df; cursor: not-allowed; }
  .row-actions .delete-option { color: #abb3c0; }
  .row-actions .delete-option:hover { color: #de557f; background: #fff0f5; }
  .is-dragging { opacity: 0.45; }
  .drop-before::before, .drop-after::after { content: ""; position: absolute; right: 0; left: 0; height: 3px; border-radius: 3px; background: #fc3171; box-shadow: 0 0 0 2px #fff; }
  .drop-before::before { top: -7px; }
  .drop-after::after { bottom: -7px; }
  .undo-notice { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; margin: 0 0 15px; border: 1px solid #e4e9ef; border-radius: 7px; background: #f7f9fb; color: #8994a3; font-size: 12px; }
  .undo-notice > span { min-width: 0; overflow-wrap: anywhere; }
  .undo-notice button { display: flex; align-items: center; gap: 5px; flex-shrink: 0; padding: 3px; border: 0; background: transparent; color: #c06688; font-size: 12px; cursor: pointer; }
  .option-warning { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; margin-top: 15px; border: 1px solid #f3e5cb; border-radius: 7px; background: #fffbf2; color: #ab854e; }
  .option-warning > p { margin: 0; font-size: 12px; line-height: 1.7; }
  .option-warning :global(svg) { margin-top: 3px; }
  .matching-hint { margin: 17px 0 0; color: #9aa4b1; font-size: 11px; line-height: 1.8; }
  .empty-options { display: flex; flex-direction: column; align-items: center; padding: 35px 18px; border: 1px dashed #e2e7ee; border-radius: 9px; text-align: center; }
  .empty-icon { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 12px; color: #d889a6; background: #fff2f7; }
  .empty-options h3 { margin: 17px 0 0; color: #647185; font-size: 14px; font-weight: 500; }
  .empty-options p { margin: 8px 0 19px; color: #a1abb8; font-size: 12px; line-height: 1.7; }
  .empty-options button { display: flex; align-items: center; gap: 6px; padding: 9px 12px; border: 1px solid #efc8d7; border-radius: 6px; background: #fff8fb; color: #ce7193; font-size: 12px; cursor: pointer; }

  @media (max-width: 600px) {
    .editor-introduction { gap: 10px; }
    .editor-introduction > p { font-size: 11px; }
    .option-count { font-size: 10px; }
    .order-note { align-items: flex-start; margin-bottom: 17px; padding: 10px; }
    .order-note :global(svg) { margin-top: 3px; }
    .order-note > p { font-size: 11px; }
    .editor-columns { display: none; }
    .option-editor-row { grid-template-columns: 25px 72px minmax(0, 1fr); gap: 12px 10px; padding: 13px 11px; }
    .order-column { grid-row: 1 / span 2; align-self: start; padding-top: 8px; }
    .mark-field { grid-column: 2; }
    .name-field { grid-column: 3; }
    .field-caption { position: static; width: auto; height: auto; margin: 0 0 7px; clip: auto; white-space: normal; display: block; color: #929cac; font-size: 10px; }
    .row-field input { height: 42px; padding: 9px; font-size: 16px; }
    .row-actions { grid-column: 2 / span 2; justify-content: flex-start; gap: 10px; border-top: 1px solid #f0f2f6; padding-top: 9px; }
    .sort-actions { padding: 0; gap: 3px; }
    .row-actions button { width: 42px; height: 38px; }
    .row-actions .delete-option { margin-left: auto; }
    .matching-hint { font-size: 10px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .option-editor-row { transition: none; }
  }
</style>
