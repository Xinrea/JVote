<script>
  import {
    Button,
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
  } from "flowbite-svelte";

  // parse params from url
  const urlParams = new URLSearchParams(window.location.search);
  // if plug_env is 1 them show config panel
  const plug_env = urlParams.get("plug_env") || "1";
  /** @type {{options: {mark: string, name: string, cnt: number}[], user_code: string, time: number, graph_type: number}}*/
  const config = {
    options: [],
    user_code: "",
    time: 30,
    graph_type: 0,
  };

  config.user_code = urlParams.get("user_code") || "";
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
  config.graph_type = parseInt(urlParams.get("graph_type") || "0") || 0;

  console.log(config);

  // copy link
  const copyLink = () => {
    // get current link
    let link = window.location.href;
    // remove params
    link = link.split("?")[0];
    link += `?user_code=${config.user_code}`;
    config.options.forEach((opt) => {
      link += `&mark[]=${opt.mark}`;
      link += `&opt[]=${opt.name}`;
    });
    link += `&time=${config.time}`;
    link += `&plug_env=0`;
    navigator.clipboard.writeText(link).then(
      () => {
        console.log("copy success");
      },
      (err) => {
        console.log("copy fail");
      }
    );
  };

  // game init
  import Game from "./game";

  // already voted
  const voted = new Set();
  let total_vote = 0;
  let winner_mark = "A";
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
      const opt = msg.data.msg[0];
      vote(msg.data.open_id, opt);
    }
  };
  let g = null;
  if (plug_env === "0") {
    g = new Game(config.user_code, handler);
    g.startGame();
  } else {
    // load options from local db
    let localOptions = localStorage.getItem("options");
    if (localOptions) {
      console.log("load options from local");
      // doesn't need to use old cnt
      config.options = JSON.parse(localOptions).map(
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
          name: "复制 CSS 到浏览器源设置以应用样式调整",
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
        // update winner
        winner_mark = config.options.reduce((prev, curr) =>
          prev.cnt > curr.cnt ? prev : curr
        ).mark;
        break;
      }
    }
    config.options = [...config.options];
  }

  function optionChange() {
    localStorage.setItem("options", JSON.stringify(config.options));
    config.options = [...config.options];
  }

  // render css
  function copyCss() {
    // save style config to local
    localStorage.setItem("style_config", JSON.stringify(style_config));
    const css = `
    body {
      --opacity: ${style_config.opacity}!important;
      --font-size: ${style_config.font_size}px!important;
      --font-family: ${style_config.font_family}!important;
      --text-color: ${style_config.text_color}!important;
      --main-color: ${style_config.main_color}!important;
      --bg-color: ${style_config.bg_color}!important;
      --text-stroke-color: ${style_config.text_stroke_color}!important;
      background-color: rgba(0, 0, 0, 0);
      margin: 0px auto;
      overflow: hidden;
    }
    `;
    navigator.clipboard.writeText(css).then(
      () => {
        console.log("copy success");
      },
      (err) => {
        console.log("copy fail");
      }
    );
  }

  let option_modal = false;
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
  <div class="main" class:stroke={style_config.text_stroke_enabled}>
    <!-- count down with progressbar -->
    {#if count_down > 0}
      <span class="count-down">剩余时间: {count_down}</span>
    {:else}
      <span class="count-down">投票已结束</span>
    {/if}

    <!-- show options as visualized vote result -->
    {#each config.options as opt}
      <div class="option" class:winner={opt.mark == winner_mark}>
        <span
          class="option-bar"
          style={"right: " + ((total_vote - opt.cnt) / total_vote) * 100 + "%"}
        ></span>
        <span class="option-mark">{opt.mark}</span>
        <span class="option-text">{opt.name}</span>
        <span class="option-cnt"
          >{opt.cnt} ({total_vote > 0
            ? ((opt.cnt / total_vote) * 100).toFixed(2) + "%"
            : "0%"})</span
        >
      </div>
    {/each}
  </div>
  {#if plug_env === "1"}
    <Card>
      <div class="mb-6">
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
          id="user_code"
        />
      </div>
      <div class="mb-6">
        <Label for="counter" class="mb-2">计票时长</Label>
        <Input type="number" bind:value={config.time} size="sm" id="counter" />
      </div>
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
                      config.options.splice(index, 1);
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
          min="0"
          max="1"
          step="0.01"
          size="sm"
          id="opacity"
        />
      </div>
      <div class="mb-6">
        {#if fontQuery}
          <Label for="font_family" class="mb-2">字体</Label>
          <Select
            bind:value={style_config.font_family}
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
          <label>字体 <br /> <input /></label>
        {/if}
      </div>
      <div class="mb-6">
        <Label class="mb-2" for="font_size">文字大小</Label>
        <div class="flex items-center">
          <Input
            type="number"
            bind:value={style_config.font_size}
            size="sm"
            id="font_size"
          />
        </div>
      </div>
      <Toggle
        bind:checked={style_config.text_stroke_enabled}
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
            id="text_color"
          />
        </div>
        <div class="ml-10">
          <Label for="text_stroke_color">描边颜色</Label>
          <input
            type="color"
            bind:value={style_config.text_stroke_color}
            id="text_stroke_color"
          />
        </div>
      </div>
      <div class="flex mb-6">
        <div>
          <Label>选项主色</Label>
          <input type="color" bind:value={style_config.main_color} />
        </div>
        <div class="ml-10">
          <Label>背景色</Label>
          <input type="color" bind:value={style_config.bg_color} />
        </div>
      </div>
      <ButtonGroup>
        <Button color="primary" on:click={copyLink} size="sm">复制链接</Button>
        <Button color="primary" on:click={copyCss} size="sm">复制 CSS</Button>
      </ButtonGroup>
    </Card>
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

  label {
    margin-bottom: 6px;
  }

  .stroke span {
    text-shadow:
      var(--text-stroke-color, white) 1px 0 0,
      var(--text-stroke-color, white) 0 1px 0,
      var(--text-stroke-color, white) 0 -1px 0,
      var(--text-stroke-color, white) -1px 0 0;
  }

  .panel {
    max-width: 30%;
    border: 1px dotted gray;
    border-radius: 6px;
    margin: 20px;
    padding: 20px;
    font-size: small;
  }

  .option {
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
    float: right;
  }

  .option-mark {
    margin-right: 20px;
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

  hr.dashed {
    border-top: 2px dashed #bbb;
  }

  input[type="color"] {
    width: 32px;
  }
</style>
