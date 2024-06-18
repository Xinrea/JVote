<script>
  import {
    Button,
    Badge,
    Label,
    Toggle,
    Input,
    Range,
    Select,
    A,
    Hr,
    ButtonGroup,
    Card,
    Modal,
    Accordion,
    AccordionItem,
    Alert,
    Textarea,
  } from "flowbite-svelte";

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
    if (config.options.length === 0) {
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
    if (localConfig && localConfig.options.length > 0) {
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
    winner_cnt = config.options.reduce((prev, curr) =>
      prev.cnt > curr.cnt ? prev : curr
    ).cnt;
    total_vote = config.options.reduce((prev, curr) => prev + curr.cnt, 0);
    config.options = [...config.options];
  }

  function cssChange() {
    localStorage.setItem("style_config", JSON.stringify(style_config));
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
  let copy_text = "";
</script>

<main
  style:--opacity={style_config.opacity}
  style:--font-size={style_config.font_size + "px"}
  style:--font-family={style_config.font_family}
  style:--text-color={style_config.text_color}
  style:--main-color={style_config.main_color}
  style:--bg-color={style_config.bg_color}
  style:--text-stroke-color={style_config.text_stroke_color}
>
  {#if valid}
    <div class="main" class:stroke={style_config.text_stroke_enabled}>
      <!-- count down with progressbar -->
      {#if count_down > 0}
        <span class="count-down">剩余时间: {count_down}</span>
      {:else}
        <span class="count-down">投票已结束</span>
      {/if}

      <!-- show options as visualized vote result -->
      {#each config.options as opt}
        <div class="option" class:winner={opt.cnt == winner_cnt}>
          <span>
            <span
              class="option-bar"
              style={"right: " +
                ((total_vote - opt.cnt) / total_vote) * 100 +
                "%"}
            ></span>
            <span
              class="option-mark font-medium inline-flex items-center justify-center rounded border px-2.5 py-0.5"
              >{opt.mark}</span
            >
            <span class="option-text">{opt.name}</span>
          </span>
          {#if config.percent}
            <span class="option-cnt"
              >{opt.cnt} ({total_vote > 0
                ? ((opt.cnt / total_vote) * 100).toFixed(2) + "%"
                : "0%"})</span
            >
          {:else}
            <span class="option-cnt">{opt.cnt}</span>
          {/if}
        </div>
      {/each}
    </div>
    {#if plug_env === "1"}
      <Card class="ml-8 panel">
        {#if config.magic}
          <div class="mb-6" class:panel={0}>
            *前往<A href="https://play-live.bilibili.com/" target="_blank"
              >互动玩法</A
            >页面右下角获取身份码
          </div>
          <div class="mb-6">
            <Label for="user_code" class="mb-2">身份码</Label>
            <Input
              type="text"
              size="sm"
              bind:value={config.user_code}
              on:change={configChange}
              id="user_code"
            />
          </div>
        {/if}
        <div class="mb-6">
          <Label for="counter" class="mb-2">计票时长</Label>
          <Input
            type="number"
            bind:value={config.time}
            on:change={configChange}
            size="sm"
            id="counter"
          />
        </div>
        <div class="mb-6">
          <Label for="percent" class="mb-2">显示投票百分比</Label>
          <Toggle
            bind:checked={config.percent}
            on:change={configChange}
            color="red"
            size="small"
            class="mb-6"
          />
          <div>
            <Button
              color="alternative"
              size="sm"
              on:click={() => {
                option_modal = true;
              }}>投票选项编辑</Button
            >
            <Modal title="投票选项编辑" bind:open={option_modal}>
              <Alert color="yellow"
                >请注意，如果弹幕能够触发多个选项，则实际只会触发顺序靠前的第一个选项。</Alert
              >
              <Accordion>
                {#each config.options as opt, index}
                  <AccordionItem>
                    <span slot="header">{"[" + opt.mark + "]" + opt.name}</span>
                    <div>
                      <Label for="option_mark" class="mb-2">选项标记</Label>
                      <Input
                        type="text"
                        bind:value={config.options[index].mark}
                        size="sm"
                        id="option_mark"
                        class="mb-2"
                      />
                      <Label for="option_name" class="mb-2">选项内容</Label>
                      <Input
                        type="text"
                        bind:value={config.options[index].name}
                        size="sm"
                        id="option_name"
                      />
                      <Button
                        color="red"
                        size="sm"
                        class="mt-2"
                        on:click={() => {
                          if (config.options.length <= 1) {
                            config.options = [];
                          } else {
                            config.options.splice(index, 1);
                          }
                          optionChange();
                        }}>删除</Button
                      >
                    </div>
                  </AccordionItem>
                {/each}
              </Accordion>
              <Button
                color="primary"
                size="sm"
                on:click={() => {
                  config.options.push({
                    mark: String.fromCharCode(65 + config.options.length),
                    name: "",
                    cnt: 0,
                  });
                  optionChange();
                }}>添加选项</Button
              >
            </Modal>
          </div>
          <Hr class="my-6" />
          <div class="mb-6">
            <Label for="opacity" class="mb-2">透明度</Label>
            <Range
              bind:value={style_config.opacity}
              on:change={cssChange}
              min="0"
              max="1"
              step="0.01"
              size="sm"
              id="opacity"
            />
          </div>
          <div class="mb-6">
            {#if fontQuery && config.magic}
              <Label for="font_family" class="mb-2">字体</Label>
              <Select
                bind:value={style_config.font_family}
                on:change={cssChange}
                items={localFonts}
                class="mb-2"
                style="width: 170px"
                size="sm"
                id="font_family"
              />
              <Button color="alternative" on:click={getFontList} size="sm"
                >获取字体列表</Button
              >
            {:else}
              <Label for="font_family" class="mb-2">字体</Label>
              <Input
                type="text"
                bind:value={style_config.font_family}
                on:change={cssChange}
                size="sm"
                id="font_family"
              />
            {/if}
          </div>
          <div class="mb-6">
            <Label class="mb-2" for="font_size">文字大小</Label>
            <div class="flex items-center">
              <Input
                type="number"
                bind:value={style_config.font_size}
                on:change={cssChange}
                size="sm"
                id="font_size"
              />
            </div>
          </div>
          <Toggle
            bind:checked={style_config.text_stroke_enabled}
            on:change={cssChange}
            color="red"
            size="small"
            class="mb-6">描边效果</Toggle
          >
          <div class="flex mb-6">
            <div>
              <Label for="text_color">文字颜色</Label>
              <input
                type="color"
                bind:value={style_config.text_color}
                on:change={cssChange}
                id="text_color"
              />
            </div>
            <div class="ml-10">
              <Label for="text_stroke_color">描边颜色</Label>
              <input
                type="color"
                bind:value={style_config.text_stroke_color}
                on:change={cssChange}
                id="text_stroke_color"
              />
            </div>
          </div>
          <div class="flex mb-6">
            <div>
              <Label>选项主色</Label>
              <input
                type="color"
                bind:value={style_config.main_color}
                on:change={cssChange}
              />
            </div>
            <div class="ml-10">
              <Label>背景色</Label>
              <input
                type="color"
                bind:value={style_config.bg_color}
                on:change={cssChange}
              />
            </div>
          </div>
          <Input
            id="copy_fake"
            style="opacity: 0; position: absolute; z-index: -1;"
            type="text"
            bind:value={copy_text}
          />
          <ButtonGroup>
            <Button color="primary" on:click={copyLink} size="sm"
              >复制链接</Button
            >
            <Button color="primary" on:click={copyCss} size="sm"
              >复制 CSS</Button
            >
          </ButtonGroup>
        </div></Card
      >
    {/if}
  {:else}
    <div class="flex items-center justify-center w-full">
      <Alert>
        <span class="font-medium">签名无效！</span>
        请重新获取插件链接
      </Alert>
    </div>
  {/if}
</main>

<style>
  main {
    padding: 1em;
    margin: 0 auto;
    display: flex;
    flex-direction: row;
  }

  .main {
    opacity: var(--opacity, 1);
    font-family: var(--font-family, Arial);
    font-size: var(--font-size, 16px);
    color: var(--text-color, black);
    padding: 20px;
    width: 100%;
  }

  .stroke span {
    text-shadow:
      var(--text-stroke-color, white) 1px 0 0,
      var(--text-stroke-color, white) 0 1px 0,
      var(--text-stroke-color, white) 0 -1px 0,
      var(--text-stroke-color, white) -1px 0 0;
  }

  .option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 10px 10px 10px 10px;
    padding: 10px 10px 10px 10px;
    border: 1px solid gray;
    border-radius: 3px;
    background-color: var(--bg-color, #ffffff);
    position: relative;
    z-index: 1;
    overflow: hidden;
    transition: all 0.5s ease-in-out;
  }

  .option-bar {
    content: "";
    position: absolute;
    z-index: -1;
    top: 0;
    bottom: 0;
    left: 0;
    right: 100%;
    background-color: var(--main-color, #fc3171bf);
    border-radius: 3px;
    transition: right 0.5s ease-in-out;
  }

  .option-cnt {
    margin-right: 10px;
  }

  .option-mark {
    margin-right: 20px;
    color: var(--main-color, #fc3171) !important;
    border-color: var(--main-color, #fc3171) !important;
    background-color: var(--bg-color, #fc3171) !important;
  }

  .count-down {
    margin: 10px;
    font-weight: bold;
  }

  .winner {
    transform-origin: left;
    scale: 1.02;
    border: 1px solid white;
    box-shadow: 0 0 5px 2px var(--main-color, #fc3171);
  }

  input[type="color"] {
    width: 32px;
  }
</style>
