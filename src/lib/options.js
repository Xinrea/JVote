// Move the whole option, including its mark and vote count. Never renumber marks.
export function moveOption(options, from, to) {
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 0 ||
    to < 0 ||
    from >= options.length ||
    to >= options.length ||
    from === to
  ) {
    return options;
  }
  const next = [...options];
  const [option] = next.splice(from, 1);
  next.splice(to, 0, option);
  return next;
}

export function nextOptionMark(options) {
  const used = new Set(options.map((option) => option.mark));
  for (let code = 65; code <= 90; code++) {
    const mark = String.fromCharCode(code);
    if (!used.has(mark)) return mark;
  }
  let number = 1;
  while (used.has(String(number))) number++;
  return String(number);
}

export function optionWarning(options) {
  if (options.some((option) => !option.mark)) {
    return "空标记会匹配所有弹幕，请为每个选项填写明确的弹幕标记。";
  }
  const marks = options.map((option) => option.mark);
  if (new Set(marks).size !== marks.length) {
    return "有选项使用了相同的标记，弹幕只会计入顺序靠前的一项。";
  }
  if (
    marks.some((mark, index) =>
      marks.some((other, otherIndex) => index !== otherIndex && mark.includes(other)),
    )
  ) {
    return "标记存在包含关系，同时匹配多个选项时，顺序靠前的选项优先。";
  }
  return "";
}
