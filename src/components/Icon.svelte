<script>
  export let name;
  export let size = 20;
  export let strokeWidth = 1.7;

  const paths = {
    sliders: ["M4 7h9m4 0h3M4 17h3m4 0h9", "M13 4v6M7 14v6"],
    monitor: ["M4 4h16v12H4z", "M8 21h8M12 16v5"],
    chevron: ["m9 5 7 7-7 7"],
    copy: ["M9 9h12v12H9z", "M15 9V3H3v12h6"],
    plus: ["M12 5v14M5 12h14"],
    grip: ["M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01"],
    up: ["m6 14 6-6 6 6"],
    down: ["m6 10 6 6 6-6"],
    trash: ["M3 6h18M9 6V3h6v3", "m5 6 1 15h12l1-15M10 10v7M14 10v7"],
    undo: ["M3 10h11a6 6 0 0 1 0 12", "m7 6-4 4 4 4"],
    check: ["m5 12 4 4L19 6"],
    clock: ["M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0", "M12 7v5l3 2"],
    info: ["M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0", "M12 11v6M12 7h.01"],
    link: ["M10 13a5 5 0 0 0 7 .1l3-3a5 5 0 0 0-7-7l-2 2", "M14 11a5 5 0 0 0-7-.1l-3 3a5 5 0 0 0 7 7l2-2"],
  };
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#each paths[name] || paths.info as path}
    <path d={path} />
  {/each}
</svg>
