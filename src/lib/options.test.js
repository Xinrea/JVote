import test from "node:test";
import assert from "node:assert/strict";
import { moveOption, nextOptionMark, optionWarning } from "./options.js";

const options = [
  { mark: "A", name: "第一项", cnt: 12 },
  { mark: "B", name: "第二项", cnt: 7 },
  { mark: "C", name: "第三项", cnt: 3 },
];

test("moving options preserves identity, marks and vote counts without mutating the source", () => {
  const moved = moveOption(options, 0, 2);
  assert.deepEqual(moved.map((option) => option.mark), ["B", "C", "A"]);
  assert.equal(moved[2], options[0]);
  assert.equal(moved[2].cnt, 12);
  assert.deepEqual(options.map((option) => option.mark), ["A", "B", "C"]);
  assert.deepEqual(moveOption(moved, 2, 0), options);
});

test("adjacent and non-adjacent moves work in both directions", () => {
  assert.deepEqual(moveOption(options, 2, 0).map((option) => option.mark), ["C", "A", "B"]);
  assert.deepEqual(moveOption(options, 1, 0).map((option) => option.mark), ["B", "A", "C"]);
  assert.deepEqual(moveOption(options, 1, 2).map((option) => option.mark), ["A", "C", "B"]);
});

test("invalid moves and empty lists are safe no-ops", () => {
  for (const [from, to] of [[-1, 0], [0, 3], [3, 0], [0, 0], [0.5, 1]]) {
    assert.equal(moveOption(options, from, to), options);
  }
  const empty = [];
  assert.equal(moveOption(empty, 0, 1), empty);
});

test("new options use an available mark after sorting or deletion", () => {
  assert.equal(nextOptionMark(moveOption(options, 2, 0)), "D");
  assert.equal(nextOptionMark([options[0], options[2]]), "B");
  assert.equal(nextOptionMark([]), "A");
  const alphabet = Array.from({ length: 26 }, (_, index) => ({
    mark: String.fromCharCode(65 + index),
  }));
  assert.equal(nextOptionMark(alphabet), "1");
  assert.equal(nextOptionMark([...alphabet, { mark: "1" }]), "2");
});

test("warnings reflect the existing case-sensitive, first-match voting rule", () => {
  assert.equal(optionWarning(options), "");
  assert.match(optionWarning([{ mark: "" }]), /空标记/);
  assert.match(optionWarning([{ mark: "A" }, { mark: "A" }]), /相同/);
  assert.match(optionWarning([{ mark: "A" }, { mark: "AB" }]), /包含关系/);
  assert.equal(optionWarning([{ mark: "A" }, { mark: "a" }]), "");
  assert.equal(optionWarning([]), "");
});
