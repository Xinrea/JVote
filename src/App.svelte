<script>
  import {
    Button,
    Label,
    Toggle,
    Input,
    Range,
    Select,
    A,
    ButtonGroup,
    Modal,
    Alert,
  } from "flowbite-svelte";
  import Icon from "./components/Icon.svelte";
  import OptionsEditor from "./components/OptionsEditor.svelte";

  // parse params from url
  const urlParams = new URLSearchParams(window.location.search);
  // if plug_env is 1 them show config panel
  const plug_env = urlParams.get("plug_env") || "1";
  /** @type {{options: {mark: string, name: string, cnt: number}[], user_code: string, time: number, percent: boolean, caller: string, mid: string, timestamp: string, code_sign: string, magic: boolean}}*/
  let config = {
    options: [],
    user_code: "",
    time: 30,
    percent: true,
    caller: "",
    mid: "",
    timestamp: "",
    code_sign: "",
    magic: false,
  };

  config.user_code = urlParams.get("Code") || "";
  config.caller = urlParams.get("Caller") || "";
  config.mid = urlParams.get("Mid") || "";
  config.timestamp = urlParams.get("Timestamp") || "";
  config.code_sign = urlParams.get("CodeSign") || "";
  config.magic = urlParams.get("magic") === "true";

  let valid = false;

  if (config.magic) {
    valid = true;
  } else {
    // verify this is a valid link
    Game.verify(
      config.caller,
      config.user_code,
      config.mid,
      config.timestamp,
      config.code_sign,
      (code) => {
        if (code !== 0) {
          console.log("invalid link");
        } else {
          valid = true;
        }
      }
    );
  }

  // get marks from url params mark[]
  const marks = urlParams.getAll("mark[]");
  const optionsExplicitlyEmpty = urlParams.get("empty_options") === "true";
  // get options from url params opt[]
  config.options = urlParams.getAll("opt[]").map((opt, index) => {
    return {
      mark: marks[index] || String.fromCharCode(65 + index),
      name: opt,
      cnt: 0,
    };
  });
  config.time = parseInt(urlParams.get("time") || "30") || 30;
  config.percent = urlParams.get("percent") === "true";

  // copy link
  const copyLink = () => {
    // get current link
    let link = window.location.href;
    // remove params
    link = link.split("?")[0];
    link += `?Code=${config.user_code}`;
    config.options.forEach((opt) => {
      // mark and opt should be url encoded
      link += `&mark[]=${encodeURIComponent(opt.mark)}`;
      link += `&opt[]=${encodeURIComponent(opt.name)}`;
    });
    if (config.options.length === 0) {
      link += "&empty_options=true";
    }
    link += `&time=${config.time}`;
    link += `&percent=${config.percent}`;
    // add Code, Caller, Mid, Timestamp, CodeSign
    link += `&Caller=${config.caller}`;
    link += `&Mid=${config.mid}`;
    link += `&Timestamp=${config.timestamp}`;
    link += `&CodeSign=${config.code_sign}`;
    link += `&plug_env=0`;

    copy_text = link;
    setTimeout(() => {
      // @ts-ignore
      document.getElementById("copy_fake").select();
      document.execCommand("Copy");
    }, 500);
  };

  // game init
  import Game from "./game";

  // already voted
  const voted = new Set();
  let total_vote = 0;
  let winner_cnt = 0;
  /**
   * @param {any} msg
   */
  const handler = (msg) => {
    if (msg.cmd === "LIVE_OPEN_PLATFORM_DM") {
      if (config.options.length === 0) {
        return;
      }
      if (voted.has(msg.data.open_id)) {
        return;
      }
      const opt = msg.data.msg;
      vote(msg.data.open_id, opt);
    }
  };
  let g = null;
  if (plug_env === "0") {
    g = new Game(config.user_code, handler);
    if (config.options.length === 0 && !optionsExplicitlyEmpty) {
      config.options = [
        {
          mark: "A",
          name: "默认选项1",
          cnt: 0,
        },
        {
          mark: "B",
          name: "默认选项2",
          cnt: 0,
        },
        {
          mark: "C",
          name: "默认选项3",
          cnt: 0,
        },
      ];
    }
    g.startGame();
  } else {
    // load config from local db
    const prev_code = config.user_code;
    let localConfig = JSON.parse(localStorage.getItem("config"));
    const hasSavedOptions = Array.isArray(localConfig?.options);
    if (localConfig) {
      console.log("load config from local");
      config.percent = localConfig.percent;
      config.time = localConfig.time;
    } else {
      localConfig = config;
    }
    if (prev_code !== "") {
      config.user_code = prev_code;
    }
    if (
      Array.isArray(localConfig?.options) &&
      (localConfig.options.length > 0 || hasSavedOptions || optionsExplicitlyEmpty)
    ) {
      console.log("load options from local");
      // doesn't need to use old cnt
      config.options = localConfig.options.map(
        (/** @type {{ mark: any; name: any; }} */ opt) => {
          return {
            mark: opt.mark,
            name: opt.name,
            cnt: 0,
          };
        }
      );
    } else {
      config.options = [
        {
          mark: "A",
          name: "请在右侧调整选项",
          cnt: 0,
        },
        {
          mark: "B",
          name: "复制链接后在 OBS 中添加相应浏览器源",
          cnt: 0,
        },
        {
          mark: "C",
          name: "复制 CSS 到浏览器源以应用样式调整",
          cnt: 0,
        },
      ];
    }

    // random vote for demo
    const random_vote = () => {
      if (config.options.length === 0) {
        return;
      }
      const opt =
        config.options[Math.floor(Math.random() * config.options.length)].mark;
      vote("demo", opt);
    };
    const vote_interval = setInterval(() => {
      if (count_down <= 0) {
        clearInterval(vote_interval);
        return;
      }
      random_vote();
    }, 1000);
  }

  let count_down = config.time;
  const timer = setInterval(() => {
    count_down -= 1;
    if (count_down <= 0) {
      clearInterval(timer);
      console.log("time is up");
      if (g) {
        g.stopGame();
      }
    }
  }, 1000);

  // if window close, clear interval and stop
  window.onbeforeunload = () => {
    clearInterval(timer);
    if (g) {
      g.stopGame();
    }
    console.log("game stop by window close");
  };
  // handle css modify
  const style_config = {
    opacity: 1,
    font_family: "Arial",
    font_size: 16,
    text_color: "#000000",
    main_color: "#fc3171",
    bg_color: "#ffffff",
    text_stroke_enabled: true,
    text_stroke_color: "#ffffff",
  };

  // load style config from local
  const localStyle = localStorage.getItem("style_config");
  if (localStyle) {
    console.log("load style config from local");
    Object.assign(style_config, JSON.parse(localStyle));
  }

  const fontQuery = "queryLocalFonts" in window;
  let localFonts = [
    {
      name: style_config.font_family,
      value: style_config.font_family,
    },
  ];
  function getFontList() {
    if (fontQuery) {
      // @ts-ignore
      window.queryLocalFonts().then((localfs) => {
        let tmpFonts = localfs.map((/** @type {{ family: any; }} */ f) => {
          return f.family;
        });
        // remove redundant fonts
        localFonts = Array.from(new Set(tmpFonts)).map((f) => {
          return {
            name: f,
            value: f,
          };
        });
      });
    }
  }

  /**
   * @param {string} id
   * @param {string} opt
   */
  function vote(id, opt) {
    // check if opt contains some of the options
    for (let i = 0; i < config.options.length; i++) {
      if (opt.includes(config.options[i].mark)) {
        voted.add(id);
        config.options[i].cnt += 1;
        total_vote++;
        // update winner to max option's cnt
        winner_cnt = config.options.reduce((prev, curr) =>
          prev.cnt > curr.cnt ? prev : curr
        ).cnt;
        break;
      }
    }
    config.options = [...config.options];
  }

  function configChange() {
    localStorage.setItem("config", JSON.stringify(config));
  }

  function optionChange() {
    configChange();
    winner_cnt = config.options.reduce((max, option) => Math.max(max, option.cnt), 0);
    total_vote = config.options.reduce((prev, curr) => prev + curr.cnt, 0);
    config.options = [...config.options];
  }

  function updateOptions(event) {
    config.options = event.detail.options;
    optionChange();
  }

  function cssChange() {
    localStorage.setItem("style_config", JSON.stringify(style_config));
    // Add this line to convert hex to RGB
    document.documentElement.style.setProperty('--main-color-rgb', hexToRgb(style_config.main_color));
  }

  // Add this helper function to convert hex to RGB
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : null;
  }

  // render css
  function copyCss() {
    const css = `main {
  --opacity: ${style_config.opacity}!important;
  --font-size: ${style_config.font_size}px!important;
  --font-family: ${style_config.font_family}!important;
  --text-color: ${style_config.text_color}!important;
  --main-color: ${style_config.main_color}!important;
  --bg-color: ${style_config.bg_color}!important;
  --text-stroke-color: ${style_config.text_stroke_enabled ? style_config.text_stroke_color : "#0000"}!important;
  background-color: rgba(0, 0, 0, 0);
  margin: 0px auto;
  overflow: hidden;
}
    `;
    copy_text = css;
    setTimeout(() => {
      // @ts-ignore
      document.getElementById("copy_fake").select();
      document.execCommand("Copy");
    }, 500);
  }

  let option_modal = false;
  let options_editor;
  let copy_text = "";

  $: isCountdownLow = count_down > 0 && count_down <= 10;
</script>

<main
  class:configuration={plug_env === "1"}
  style:--opacity={style_config.opacity}
  style:--font-size={style_config.font_size + "px"}
  style:--font-family={style_config.font_family}
  style:--text-color={style_config.text_color}
  style:--main-color={style_config.main_color}
  style:--bg-color={style_config.bg_color}
  style:--text-stroke-color={style_config.text_stroke_color}
>
  {#if valid}
    <section class="preview-region" aria-label="投票展示">
      {#if plug_env === "1"}
        <div class="preview-heading">
          <div class="preview-title"><Icon name="monitor" size={17} /><h1>效果预览</h1></div>
          <span class="preview-badge"><span></span>模拟计票</span>
        </div>
      {/if}

      <div class="main" class:stroke={style_config.text_stroke_enabled}>
        <span class="count-down" class:pulse={isCountdownLow}>
          <span class="clock-icon"><Icon name="clock" size={19} /></span>
          {#if count_down > 0}
            剩余时间：<span class="countdown-value">{count_down}</span><span class="countdown-unit">秒</span>
          {:else}
            投票已结束
          {/if}
        </span>

        {#each config.options as opt}
          <div class="option" class:winner={winner_cnt > 0 && opt.cnt === winner_cnt}>
            <span class="option-bar" style:right={total_vote > 0 ? ((total_vote - opt.cnt) / total_vote) * 100 + "%" : "100%"}></span>
            <span class="option-label">
              <span class="option-mark">{opt.mark}</span>
              <span class="option-text">{opt.name}</span>
            </span>
            {#if config.percent}
              <span class="option-cnt">{opt.cnt} <span class="option-percent">({total_vote > 0 ? ((opt.cnt / total_vote) * 100).toFixed(2) + "%" : "0%"})</span></span>
            {:else}
              <span class="option-cnt">{opt.cnt}</span>
            {/if}
          </div>
        {/each}
      </div>

      {#if plug_env === "1"}
        <p class="preview-hint"><Icon name="info" size={14} />此处为模拟预览，正式计票在 OBS 浏览器源中进行。</p>
      {/if}
    </section>

    {#if plug_env === "1"}
      <aside class="settings-panel" aria-label="投票配置">
        <div class="settings-heading">
          <div><span class="settings-icon"><Icon name="sliders" size={18} /></span><h2>投票配置</h2></div>
          <p>调整设置，即时预览展示效果</p>
        </div>

        <div class="settings-scroll">
          {#if config.magic}
            <div class="settings-section identity-section">
              <div class="field">
                <Label for="user_code">主播身份码</Label>
                <Input type="text" size="sm" bind:value={config.user_code} on:change={configChange} id="user_code" placeholder="填写主播身份码" />
                <p class="field-help">前往<A href="https://play-live.bilibili.com/" target="_blank" rel="noreferrer">互动玩法</A>页面右下角获取身份码</p>
              </div>
            </div>
          {/if}

          <div class="settings-section">
            <div class="section-heading"><span>计票设置</span></div>
            <div class="field">
              <Label for="counter">计票时长<span class="label-unit">秒</span></Label>
              <Input type="number" bind:value={config.time} on:change={configChange} size="sm" id="counter" />
            </div>
            <div class="toggle-field">
              <Toggle bind:checked={config.percent} on:change={configChange} color="primary" size="small" id="percent">显示投票百分比</Toggle>
            </div>
            <Button color="alternative" size="sm" class="edit-options-button" on:click={() => (option_modal = true)}><Icon name="sliders" size={16} />投票选项编辑<Icon name="chevron" size={15} /></Button>
          </div>

          <div class="settings-section">
            <div class="section-heading"><span>显示样式</span></div>
            <div class="field">
              <Label for="opacity">透明度<span class="range-value">{Math.round(style_config.opacity * 100)}%</span></Label>
              <Range bind:value={style_config.opacity} on:change={cssChange} min="0" max="1" step="0.01" size="sm" id="opacity" />
            </div>
            <div class="field">
              <Label for="font_family">字体</Label>
              {#if fontQuery && config.magic}
                <div class="font-controls">
                  <Select bind:value={style_config.font_family} on:change={cssChange} items={localFonts} size="sm" id="font_family" />
                  <Button color="alternative" on:click={getFontList} size="sm">获取字体列表</Button>
                </div>
              {:else}
                <Input type="text" bind:value={style_config.font_family} on:change={cssChange} size="sm" id="font_family" />
              {/if}
            </div>
            <div class="field">
              <Label for="font_size">文字大小<span class="label-unit">px</span></Label>
              <Input type="number" bind:value={style_config.font_size} on:change={cssChange} size="sm" id="font_size" />
            </div>
            <div class="toggle-field">
              <Toggle bind:checked={style_config.text_stroke_enabled} on:change={cssChange} color="primary" size="small">描边效果</Toggle>
            </div>
            <div class="color-grid">
              <div class="color-field"><Label for="text_color">文字颜色</Label><input type="color" bind:value={style_config.text_color} on:change={cssChange} id="text_color" /></div>
              <div class="color-field"><Label for="text_stroke_color">描边颜色</Label><input type="color" bind:value={style_config.text_stroke_color} on:change={cssChange} id="text_stroke_color" /></div>
              <div class="color-field"><Label for="main_color">选项主色</Label><input type="color" bind:value={style_config.main_color} on:change={cssChange} id="main_color" /></div>
              <div class="color-field"><Label for="bg_color">背景颜色</Label><input type="color" bind:value={style_config.bg_color} on:change={cssChange} id="bg_color" /></div>
            </div>
          </div>
        </div>

        <div class="settings-footer">
          <Input id="copy_fake" style="opacity: 0; position: absolute; z-index: -1;" type="text" bind:value={copy_text} tabindex="-1" aria-hidden="true" />
          <ButtonGroup class="copy-actions">
            <Button color="primary" on:click={copyLink} size="sm"><Icon name="link" size={16} />复制链接</Button>
            <Button color="alternative" on:click={copyCss} size="sm"><Icon name="copy" size={16} />复制 CSS</Button>
          </ButtonGroup>
          <p>用于 OBS 浏览器源的链接与自定义样式</p>
        </div>
      </aside>

      <Modal
        title="投票选项编辑"
        size="lg"
        bind:open={option_modal}
        class="options-modal"
        classHeader="options-modal-header"
        classBody="options-modal-body"
        footerClass="flex items-center options-modal-footer"
      >
        <OptionsEditor bind:this={options_editor} options={config.options} on:change={updateOptions} />
        <svelte:fragment slot="footer">
          <Button color="alternative" size="sm" class="add-option-button" on:click={() => options_editor.addOption()}><Icon name="plus" size={16} />添加选项</Button>
          <span class="options-save-hint"><Icon name="check" size={14} />修改即时生效并保存在本机</span>
          <Button color="primary" size="sm" class="finish-options-button" on:click={() => (option_modal = false)}>完成</Button>
        </svelte:fragment>
      </Modal>
    {/if}
  {:else}
    <div class="invalid-link"><Alert><span class="font-medium">签名无效！</span> 请重新获取插件链接</Alert></div>
  {/if}
</main>

<style>
  main {
    display: flex;
    align-items: flex-start;
    gap: 24px;
    margin: 0 auto;
    padding: 16px;
  }

  main.configuration {
    height: 100vh;
    height: 100dvh;
    min-height: 360px;
    padding: 20px;
  }

  .preview-region {
    flex: 1;
    min-width: 0;
  }

  .configuration .preview-region {
    padding: 14px 8px;
  }

  .preview-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 29px;
  }

  .preview-title {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #818895;
  }

  .preview-title h1 {
    margin: 0;
    color: #505867;
    font-size: 14px;
    font-weight: 600;
  }

  .preview-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 8px;
    border: 1px solid #eceef2;
    border-radius: 5px;
    color: #9399a4;
    background: #fafbfc;
    font-size: 11px;
  }

  .preview-badge > span {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #b0b5bf;
  }

  .main {
    width: 100%;
    opacity: var(--opacity, 1);
    font-family: var(--font-family, Arial);
    font-size: var(--font-size, 16px);
    color: var(--text-color, black);
  }

  .stroke .option-label,
  .stroke .option-cnt {
    text-shadow:
      var(--text-stroke-color, white) 1px 1px 0,
      var(--text-stroke-color, white) -1px 1px 0,
      var(--text-stroke-color, white) 1px -1px 0,
      var(--text-stroke-color, white) -1px -1px 0,
      var(--text-stroke-color, white) 1px 0 0,
      var(--text-stroke-color, white) 0 1px 0,
      var(--text-stroke-color, white) -1px 0 0,
      var(--text-stroke-color, white) 0 -1px 0;
  }

  .count-down {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 10px 13px;
    margin-bottom: 18px;
    border: 1px solid color-mix(in srgb, var(--main-color, #fc3171) 15%, transparent);
    border-radius: 9px;
    color: var(--main-color, #fc3171);
    background: color-mix(in srgb, var(--main-color, #fc3171) 6%, var(--bg-color, #fff));
    font-size: 0.9em;
    font-weight: 600;
    line-height: 1.4;
  }

  .clock-icon {
    display: flex;
    align-items: center;
    margin-right: 3px;
  }

  .countdown-value {
    font-variant-numeric: tabular-nums;
    font-size: 1.1em;
  }

  .countdown-unit {
    margin-left: -2px;
    font-size: 0.85em;
    font-weight: 400;
  }

  .option {
    position: relative;
    z-index: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    overflow: hidden;
    padding: 15px 17px;
    margin-bottom: 12px;
    border: 1px solid color-mix(in srgb, var(--text-color, #000) 13%, var(--bg-color, #fff));
    border-radius: 9px;
    background: var(--bg-color, #fff);
    box-shadow: 0 2px 5px #1d273b05;
    transition: border-color 250ms, box-shadow 250ms;
  }

  .option-bar {
    position: absolute;
    z-index: -1;
    top: 0;
    bottom: 0;
    left: 0;
    right: 100%;
    background: color-mix(in srgb, var(--main-color, #fc3171) 16%, transparent);
    transition: right 500ms ease;
  }

  .option-label {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 14px;
    min-width: 0;
  }

  .option-mark {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    min-width: 33px;
    min-height: 33px;
    max-width: 35%;
    padding: 4px 9px;
    border: 1px solid color-mix(in srgb, var(--main-color, #fc3171) 30%, var(--bg-color, #fff));
    border-radius: 6px;
    color: var(--main-color, #fc3171);
    background: var(--bg-color, #fff);
    font-weight: 600;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }

  .option-text {
    min-width: 0;
    font-weight: 500;
    line-height: 1.6;
    overflow-wrap: anywhere;
  }

  .option-cnt {
    flex-shrink: 0;
    white-space: nowrap;
    font-size: 0.9em;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .option-percent {
    font-size: 0.85em;
    font-weight: 400;
  }

  .winner {
    border-color: color-mix(in srgb, var(--main-color, #fc3171) 55%, var(--bg-color, #fff));
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--main-color, #fc3171) 7%, transparent);
  }

  .pulse {
    animation: countdown-pulse 1.5s ease-in-out infinite;
  }

  .preview-hint {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    margin: 21px 0 0;
    color: #929aa5;
    font-size: 11px;
    line-height: 1.7;
  }

  .preview-hint :global(svg) {
    margin-top: 2px;
    flex-shrink: 0;
  }

  .invalid-link {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
  }

  @keyframes countdown-pulse {
    50% { opacity: 0.6; }
  }

  @media (max-width: 1000px) {
    main { gap: 20px; }
    main.configuration { padding: 16px; }
    .configuration .preview-region { padding: 12px 2px; }
    .option { gap: 10px; padding: 13px 14px; }
    .option-label { gap: 10px; }
  }

  @media (max-width: 760px) {
    main.configuration {
      flex-direction: column;
      gap: 24px;
      height: auto;
      min-height: 100vh;
      padding: 16px;
    }

    .configuration .preview-region {
      flex: none;
      width: 100%;
      padding: 5px 0 0;
    }

    .preview-heading { margin-bottom: 20px; }
    .option { gap: 8px; padding: 12px; }
    .option-label { gap: 9px; }
    .option-mark { min-width: 30px; min-height: 30px; padding: 3px 7px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .pulse { animation: none; }
    .option, .option-bar { transition: none; }
  }
</style>
